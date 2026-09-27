import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  PROJECT_FILE_FORMAT,
  ProjectFileError,
  ProjectFileErrorCode,
} from './shared';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function migrateV1ToV2(document: Record<string, unknown>): Record<string, unknown> {
  const project = document.project;

  if (!isRecord(project)) {
    throw new ProjectFileError(
      ProjectFileErrorCode.InvalidSchema,
      'project must be an object before V1 to V2 migration',
    );
  }

  return {
    ...document,
    schemaVersion: 2,
    project: {
      ...project,
      sources: [],
    },
  };
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

  if (schemaVersion === CURRENT_PROJECT_SCHEMA_VERSION) {
    return document;
  }

  if (schemaVersion === 1) {
    return migrateV1ToV2(document);
  }

  throw new ProjectFileError(
    ProjectFileErrorCode.UnsupportedSchemaVersion,
    `project schema version ${schemaVersion} has no registered migration to version ${CURRENT_PROJECT_SCHEMA_VERSION}`,
  );
}
