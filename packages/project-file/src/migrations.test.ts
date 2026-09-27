import { describe, expect, it } from 'vitest';

import { CURRENT_PROJECT_SCHEMA_VERSION, PROJECT_FILE_FORMAT, ProjectFileErrorCode } from './index';
import { migrateProjectFileDocument } from './migrations';

describe('project migration infrastructure', () => {
  it('passes the current schema through unchanged', () => {
    const document = {
      format: PROJECT_FILE_FORMAT,
      schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
      project: {},
    };

    expect(migrateProjectFileDocument(document)).toBe(document);
  });

  it('rejects future schema versions before migration', () => {
    const document = {
      format: PROJECT_FILE_FORMAT,
      schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION + 1,
      project: {},
    };

    expect(() => migrateProjectFileDocument(document)).toThrowError(
      expect.objectContaining({
        code: ProjectFileErrorCode.UnsupportedSchemaVersion,
      }),
    );
  });
});
