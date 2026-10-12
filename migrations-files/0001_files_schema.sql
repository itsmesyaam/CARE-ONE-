-- D1 File Store Schema
-- CareOne Patient Document Chunk Storage

CREATE TABLE IF NOT EXISTS file_objects (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size >= 0),
  sha256 TEXT NOT NULL,
  chunk_count INTEGER NOT NULL CHECK (chunk_count > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_file_objects_patient ON file_objects(patient_id);
CREATE INDEX IF NOT EXISTS idx_file_objects_document ON file_objects(document_id);

CREATE TABLE IF NOT EXISTS file_chunks (
  file_id TEXT NOT NULL REFERENCES file_objects(id) ON DELETE RESTRICT,
  idx INTEGER NOT NULL CHECK (idx >= 0),
  data BLOB NOT NULL,
  PRIMARY KEY (file_id, idx)
);

-- Write-Once Immutability Guards for file_objects
CREATE TRIGGER IF NOT EXISTS trg_file_objects_no_update
BEFORE UPDATE ON file_objects
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'file_objects rows are write-once and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_file_objects_no_delete
BEFORE DELETE ON file_objects
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'file_objects rows cannot be deleted');
END;

-- Write-Once Immutability Guards for file_chunks
CREATE TRIGGER IF NOT EXISTS trg_file_chunks_no_update
BEFORE UPDATE ON file_chunks
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'file_chunks rows are write-once and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_file_chunks_no_delete
BEFORE DELETE ON file_chunks
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'file_chunks rows cannot be deleted');
END;
