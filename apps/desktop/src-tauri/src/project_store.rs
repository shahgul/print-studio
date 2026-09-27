use std::{
    fs,
    io::{self, Write},
    path::Path,
};

use tempfile::Builder;

const PROJECT_EXTENSION: &str = "printstudio";
const MAX_PROJECT_FILE_BYTES: u64 = 16 * 1024 * 1024;

fn validate_project_path(path: &Path) -> io::Result<()> {
    let valid_extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case(PROJECT_EXTENSION));

    if !valid_extension {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "project path must end in .printstudio",
        ));
    }

    Ok(())
}

fn project_parent(path: &Path) -> &Path {
    path.parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."))
}

pub(crate) fn read_project_text(path: &Path) -> io::Result<String> {
    validate_project_path(path)?;

    let metadata = fs::metadata(path)?;
    if metadata.len() > MAX_PROJECT_FILE_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "project file exceeds the current 16 MiB safety limit",
        ));
    }

    fs::read_to_string(path)
}

pub(crate) fn remove_project_text(path: &Path) -> io::Result<()> {
    validate_project_path(path)?;

    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

pub(crate) fn write_project_text_atomic(path: &Path, content: &str) -> io::Result<()> {
    validate_project_path(path)?;

    if content.len() as u64 > MAX_PROJECT_FILE_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "project content exceeds the current 16 MiB safety limit",
        ));
    }

    let parent = project_parent(path);
    let mut temporary = Builder::new()
        .prefix(".printstudio-")
        .suffix(".tmp")
        .tempfile_in(parent)?;

    temporary.write_all(content.as_bytes())?;
    temporary.flush()?;
    temporary.as_file().sync_all()?;

    temporary.persist(path).map_err(|error| error.error)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn writes_a_new_project_file() {
        let directory = tempdir().expect("create temp directory");
        let target = directory.path().join("new.printstudio");

        write_project_text_atomic(&target, "first").expect("write project");

        assert_eq!(fs::read_to_string(target).expect("read project"), "first");
    }

    #[test]
    fn atomically_replaces_an_existing_project_file() {
        let directory = tempdir().expect("create temp directory");
        let target = directory.path().join("existing.printstudio");
        fs::write(&target, "old").expect("seed old project");

        write_project_text_atomic(&target, "new").expect("replace project");

        assert_eq!(fs::read_to_string(target).expect("read project"), "new");
    }

    #[test]
    fn invalid_extension_does_not_modify_existing_file() {
        let directory = tempdir().expect("create temp directory");
        let target = directory.path().join("existing.txt");
        fs::write(&target, "old").expect("seed old file");

        let error =
            write_project_text_atomic(&target, "new").expect_err("reject invalid extension");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
        assert_eq!(fs::read_to_string(target).expect("read old file"), "old");
    }

    #[test]
    fn reads_only_project_files() {
        let directory = tempdir().expect("create temp directory");
        let project_path = directory.path().join("project.printstudio");
        let text_path = directory.path().join("project.txt");
        fs::write(&project_path, "project").expect("write project");
        fs::write(&text_path, "text").expect("write text");

        assert_eq!(
            read_project_text(&project_path).expect("read project"),
            "project"
        );
        assert_eq!(
            read_project_text(&text_path)
                .expect_err("reject non-project file")
                .kind(),
            io::ErrorKind::InvalidInput
        );
    }

    #[test]
    fn removes_a_project_file_idempotently() {
        let directory = tempdir().expect("create temp directory");
        let target = directory.path().join("project.autosave.printstudio");
        fs::write(&target, "recovery").expect("seed recovery project");

        remove_project_text(&target).expect("remove recovery project");
        remove_project_text(&target).expect("repeat recovery removal");

        assert!(!target.exists());
    }

    #[test]
    fn rejects_removing_non_project_files() {
        let directory = tempdir().expect("create temp directory");
        let target = directory.path().join("project.txt");
        fs::write(&target, "keep me").expect("seed non-project file");

        let error = remove_project_text(&target).expect_err("reject non-project removal");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
        assert_eq!(
            fs::read_to_string(target).expect("read non-project file"),
            "keep me"
        );
    }

    #[test]
    fn rejects_oversized_project_content_before_touching_existing_file() {
        let directory = tempdir().expect("create temp directory");
        let target = directory.path().join("existing.printstudio");
        fs::write(&target, "old").expect("seed old project");
        let oversized = "x".repeat(MAX_PROJECT_FILE_BYTES as usize + 1);

        let error =
            write_project_text_atomic(&target, &oversized).expect_err("reject oversized content");

        assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
        assert_eq!(fs::read_to_string(target).expect("read old file"), "old");
    }
}
