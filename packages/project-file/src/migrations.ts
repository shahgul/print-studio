import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  PROJECT_FILE_FORMAT,
  ProjectFileError,
  ProjectFileErrorCode,
} from './shared';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function migrateProjectFileDocument(document: unknown): unknown {
  if (!isRecord(document)) {
    throw new ProjectFileError(
      ProjectFileErrorCode.InvalidSchema,
      'project file root must be an object',
    );
  }

  if (document.format !== PROJECT_FILE_FORMAT) {
    throw new ProjectFileError(
      ProjectFileErrorCode.InvalidFormat,
      'file is not a Print Studio project',
    );
  }

  if (!Number.isSafeInteger(document.schemaVersion)) {
    throw new ProjectFileError(
      ProjectFileErrorCode.InvalidSchema,
      'schemaVersion must be a safe integer',
    );
  }

  const schemaVersion = document.schemaVersion as number;

  if (schemaVersion > CURRENT_PROJECT_SCHEMA_VERSION) {
    throw new ProjectFileError(
      ProjectFileErrorCode.UnsupportedSchemaVersion,
      `project schema version ${schemaVersion} is newer than supported version ${CURRENT_PROJECT_SCHEMA_VERSION}`,
    );
  }

  if (schemaVersion < CURRENT_PROJECT_SCHEMA_VERSION) {
    throw new ProjectFileError(
      ProjectFileErrorCode.UnsupportedSchemaVersion,
      `project schema version ${schemaVersion} has no registered migration to version ${CURRENT_PROJECT_SCHEMA_VERSION}`,
    );
  }

  return document;
}
