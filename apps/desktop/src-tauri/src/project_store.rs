use std::{
    fs,
    io,
    path::Path,
};

const PROJECT_EXTENSION: &str = "printstudio";

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

pub(crate) fn read_project_text(path: &Path) -> io::Result<String> {
    validate_project_path(path)?;
    fs::read_to_string(path)
}

pub(crate) fn write_project_text_atomic(path: &Path, _content: &str) -> io::Result<()> {
    validate_project_path(path)?;
    Err(io::Error::new(
        io::ErrorKind::Unsupported,
        "atomic project writes are not implemented yet",
    ))
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

        let error = write_project_text_atomic(&target, "new").expect_err("reject invalid extension");

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
            read_project_text(&text_path).expect_err("reject non-project file").kind(),
            io::ErrorKind::InvalidInput
        );
    }
}
