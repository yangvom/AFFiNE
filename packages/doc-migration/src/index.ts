/**
 * Migrate YDoc from version 0.6.0 to 0.8.0
 */
import { migrateToSubdoc } from '@affine/env/blocksuite';
import { __unstableSchemas, AffineSchemas } from '@blocksuite/blocks/models';
import { Schema } from '@blocksuite/store';
import { tryMigrate } from '@blocksuite/store-0.6.0';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { Doc, Map as YMap } from 'yjs';

import { loadYDoc, saveFile as saveYDocJSON, saveYDocBinary } from './util';

const folder = 'asset-simple';
const originalDocFile = `${folder}/doc.bin`;
const jsonOutputFile = `${folder}/migrated.json`;

const path = resolve(dirname(fileURLToPath(import.meta.url)), originalDocFile);
const originalDoc = loadYDoc(path);

function trimWhiteboardElements(doc: Doc) {
  const yMaps: YMap<unknown>[] = [];
  for (const key in doc.toJSON()) {
    const map = doc.getMap(key);
    const keys = [...map.keys()];
    if (!(keys.includes('versions') || keys.length === 0)) {
      yMaps.push(map);
    }
  }
  yMaps.forEach(yMap => dealYMap(yMap));
}

function dealYMap(map: YMap<unknown>) {
  for (const key of map.keys()) {
    const block = map.get(key) as YMap<unknown>;
    if (!block) {
      console.warn('block empty');
      continue;
    }
    const blockJSON = block.toJSON();
    if (['affine:surface'].includes(blockJSON['sys:flavour'])) {
      const elementsMap = block.get('elements') as YMap<unknown> | undefined;
      if (elementsMap) {
        elementsMap.clear();
      } else {
        console.warn('elements undefined!');
      }
    }
  }
}

trimWhiteboardElements(originalDoc); // migrate step1
tryMigrate(originalDoc); // migrate step2
const migratedDoc = migrateToSubdoc(originalDoc); // migrate step3

const intermediateBlockVersions = {
  'affine:code': 1,
  'affine:paragraph': 1,
  'affine:page': 2,
  'affine:list': 1,
  'affine:divider': 1,
  'affine:surface': 3,
  'affine:database': 2,
  'affine:note': 1,
  'affine:image': 1,
};

const globalBlockSuiteSchema = new Schema();
globalBlockSuiteSchema.register(AffineSchemas).register(__unstableSchemas);
globalBlockSuiteSchema.upgradeWorkspace(migratedDoc);
for (const subdoc of [...migratedDoc.subdocs]) {
  globalBlockSuiteSchema.upgradePage(intermediateBlockVersions, subdoc); // migrate step4
}

// migrate step5
const subDocs = migratedDoc.get('spaces') as YMap<Doc>;
for (const key of subDocs.keys()) {
  const subDoc = subDocs.get(key) as Doc;
  const blocks = subDoc.get('blocks') as YMap<unknown>;

  for (const key of blocks.keys()) {
    const block = blocks.get(key) as YMap<unknown>;
    const flavour = block.get('sys:flavour') as string;
    if (flavour === 'affine:note') {
      console.warn('update affine:note!');
      block.set('prop:index', 'a0');
      block.set('prop:hidden', false);
    }
  }
}

saveYDocJSON(jsonOutputFile, migratedDoc);
// const map: Record<string, string> = {};
// migratedDoc.guid = 'rootDoc';
// const docs: Doc[] = [migratedDoc];
// while (docs.length > 0) {
//     const doc = docs.shift();
//     if (!doc) break;
//     if (doc.subdocs) {
//         for (const subdoc of doc.subdocs) {
//             docs.push(subdoc);
//         }
//     }
//     map[doc.guid] = Buffer.from(encodeStateAsUpdate(doc)).toString('base64');
// }

// const output = JSON.stringify(map);
// const docPath = resolve(dirname(fileURLToPath(import.meta.url)), `${folder}/saved_doc.base64`);
// fs.writeFileSync(docPath, output, 'utf-8');
saveYDocBinary(migratedDoc, folder);
