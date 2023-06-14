use jwst_codec::Doc;
use napi::{bindgen_prelude::*, threadsafe_function::ThreadsafeFunction};
use napi_derive::napi;
use sqlx::{Pool, Sqlite};

use crate::sqlite::{SqliteConnection, UpdateRow};

#[napi]
pub struct QueryEngine {
  sqlite: Pool<Sqlite>,
}

#[napi]
impl QueryEngine {
  #[napi]
  pub fn new(sqlite: &SqliteConnection) -> Self {
    Self {
      sqlite: sqlite.pool.clone(),
    }
  }

  #[napi]
  pub async fn load(&self, yjs_to_json: ThreadsafeFunction<Buffer>) -> Result<()> {
    let mut doc = Doc::default();
    let updates = sqlx::query_as!(UpdateRow, "SELECT * FROM updates")
      .fetch_all(&self.sqlite)
      .await
      .map_err(anyhow::Error::from)?;
    for update in updates {
      doc
        .apply_update_from_binary(update.data.to_vec())
        .map_err(|err| Error::new(Status::GenericFailure, format!("{err}")))?;
    }
    let encoded = doc
      .encode_update_v1()
      .map_err(|err| Error::new(Status::GenericFailure, format!("{err}")))?;
    yjs_to_json.call_async(Ok(encoded.into())).await?;
    Ok(())
  }
}
