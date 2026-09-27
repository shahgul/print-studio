use std::{fs, io, path::Path};

pub(crate) const MAX_SOURCE_FILE_BYTES: u64 = 256 * 1024 * 1024;

pub(crate) fn source_file_exists(path: &Path) -> io::Result<bool> {
    match fs::metadata(path) {
        Ok(metadata) => Ok(metadata.is_file()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(error),
    }
}

pub(crate) fn read_source_bytes(path: &Path) -> io::Result<Vec<u8>> {
    read_source_bytes_with_limit(path, MAX_SOURCE_FILE_BYTES)
}

fn read_source_bytes_with_limit(path: &Path, max_bytes: u64) -> io::Result<Vec<u8>> {
    let metadata = fs::metadata(path)?;

    if !metadata.is_file() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "source path must reference a regular file",
        ));
    }

    if metadata.len() > max_bytes {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "source file is {} bytes, exceeding the {}-byte native read limit",
                metadata.len(),
                max_bytes
            ),
        ));
    }

    fs::read(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn reports_source_file_existence_without_reading_bytes() {
        let directory = tempdir().expect("create temp directory");
        let existing = directory.path().join("photo.png");
        let missing = directory.path().join("missing.png");
        fs::write(&existing, [1_u8, 2, 3]).expect("seed source");

        assert!(source_file_exists(&existing).expect("probe existing source"));
        assert!(!source_file_exists(&missing).expect("probe missing source"));
    }

    #[test]
    fn reads_source_bytes_within_the_native_limit() {
        let directory = tempdir().expect("create temp directory");
        let target = directory.path().join("photo.png");
        fs::write(&target, [1_u8, 2, 3, 4]).expect("seed source");

        let bytes = read_source_bytes_with_limit(&target, 4).expect("read source");

        assert_eq!(bytes, vec![1, 2, 3, 4]);
    }

    #[test]
    fn rejects_source_larger_than_the_native_limit() {
        let directory = tempdir().expect("create temp directory");
        let target = directory.path().join("large.pdf");
        fs::write(&target, [1_u8, 2, 3, 4, 5]).expect("seed source");

        let error = read_source_bytes_with_limit(&target, 4).expect_err("reject oversized source");

        assert_eq!(error.kind(), std::io::ErrorKind::InvalidData);
    }
}
