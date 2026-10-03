use std::{
    io::{self, Write},
    path::Path,
};
use tempfile::Builder;

pub(crate) const MAX_PDF_OUTPUT_BYTES: usize = 64 * 1024 * 1024;

pub(crate) fn decode_export_path(encoded: &str) -> io::Result<String> {
    let mut decoded = Vec::with_capacity(encoded.len());
    let mut bytes = encoded.bytes();
    while let Some(byte) = bytes.next() {
        if byte == b'%' {
            let high = bytes.next().and_then(|value| (value as char).to_digit(16));
            let low = bytes.next().and_then(|value| (value as char).to_digit(16));
            match (high, low) {
                (Some(high), Some(low)) => decoded.push((high * 16 + low) as u8),
                _ => {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidInput,
                        "invalid encoded PDF path",
                    ))
                }
            }
        } else {
            decoded.push(byte);
        }
    }
    if decoded.contains(&0) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "PDF path contains NUL",
        ));
    }
    String::from_utf8(decoded).map_err(|error| io::Error::new(io::ErrorKind::InvalidInput, error))
}

pub(crate) fn write_pdf_bytes_atomic(path: &Path, bytes: &[u8]) -> io::Result<()> {
    write_pdf_with_limit(path, bytes, MAX_PDF_OUTPUT_BYTES)
}

fn write_pdf_with_limit(path: &Path, bytes: &[u8], limit: usize) -> io::Result<()> {
    if !path
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("pdf"))
    {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "output path must end in .pdf",
        ));
    }
    if bytes.len() > limit || !bytes.starts_with(b"%PDF-") {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "invalid or oversized PDF output",
        ));
    }
    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let mut temporary = Builder::new()
        .prefix(".printstudio-pdf-")
        .suffix(".tmp")
        .tempfile_in(parent)?;
    temporary.write_all(bytes)?;
    temporary.flush()?;
    temporary.as_file().sync_all()?;
    temporary.persist(path).map_err(|error| error.error)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, io};
    use tempfile::tempdir;

    #[test]
    fn creates_and_replaces_binary_pdf_with_unicode_path() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("測定 #1.pdf");
        write_pdf_bytes_atomic(&path, b"%PDF-1.7\nfirst").unwrap();
        write_pdf_bytes_atomic(&path, b"%PDF-1.7\nsecond").unwrap();
        assert_eq!(fs::read(&path).unwrap(), b"%PDF-1.7\nsecond");
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    }

    #[test]
    fn invalid_content_extension_and_limit_leave_existing_file_intact() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("existing.pdf");
        fs::write(&path, b"old").unwrap();
        assert_eq!(
            write_pdf_bytes_atomic(&path, b"invalid")
                .unwrap_err()
                .kind(),
            io::ErrorKind::InvalidInput
        );
        assert!(write_pdf_with_limit(&path, b"%PDF-1.7\n", 4).is_err());
        assert_eq!(fs::read(&path).unwrap(), b"old");
        let txt = directory.path().join("keep.txt");
        fs::write(&txt, b"keep").unwrap();
        assert!(write_pdf_bytes_atomic(&txt, b"%PDF-1.7\n").is_err());
        assert_eq!(fs::read(&txt).unwrap(), b"keep");
    }

    #[test]
    fn decodes_encoded_path_and_rejects_malformed_headers() {
        assert_eq!(
            decode_export_path("D%3A%5Cjobs%5C%E6%B8%AC%E5%AE%9A%20%231.pdf").unwrap(),
            "D:\\jobs\\測定 #1.pdf"
        );
        for value in ["%", "%GG", "%FF", "%00"] {
            assert!(decode_export_path(value).is_err());
        }
    }

    #[test]
    fn reports_missing_parent_without_creating_output() {
        let directory = tempdir().unwrap();
        let path = directory.path().join("missing/output.pdf");
        assert!(write_pdf_bytes_atomic(&path, b"%PDF-1.7\n").is_err());
        assert!(!path.exists());
    }
}
