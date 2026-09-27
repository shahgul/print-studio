#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

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
