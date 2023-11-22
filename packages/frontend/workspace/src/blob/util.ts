import isSvg from 'is-svg';

function isSvgBufferFuzzy(buffer: Uint8Array) {
  // check first non-whitespace character is '<'
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];

    // skip whitespace
    if (
      ch === 0x20 ||
      ch === 0x09 ||
      ch === 0x0b ||
      ch === 0x0c ||
      ch === 0xa0
    ) {
      continue;
    }

    return ch === 0x3c /* '<' */;
  }

  return false;
}

// this has a overhead of converting to string for testing if it is svg.
// is there a more performant way?
export function isSvgBuffer(buffer: Uint8Array) {
  if (!isSvgBufferFuzzy(buffer)) {
    return false;
  }
  const decoder = new TextDecoder('utf-8');
  const str = decoder.decode(buffer);
  return isSvg(str);
}

export function bufferToBlob(buffer: Uint8Array | ArrayBuffer) {
  const isSVG = isSvgBuffer(
    buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer
  );
  // for svg blob, we need to explicitly set the type to image/svg+xml
  return isSVG
    ? new Blob([buffer], { type: 'image/svg+xml' })
    : new Blob([buffer]);
}
