export enum ProjectFileErrorCode {
  InvalidJson = 'INVALID_JSON',
  InvalidFormat = 'INVALID_FORMAT',
  UnsupportedSchemaVersion = 'UNSUPPORTED_SCHEMA_VERSION',
  InvalidSchema = 'INVALID_SCHEMA',
  InvalidProject = 'INVALID_PROJECT',
}

export class ProjectFileError extends Error {
  constructor(
    readonly code: ProjectFileErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ProjectFileError';
  }
}
