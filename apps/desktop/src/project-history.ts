import { Project } from '@print-studio/domain';
import { Length } from '@print-studio/units-geometry';

type Geometry = Pick<Project, 'items' | 'sheets'>;
type Action = Readonly<{ before: Geometry; after: Geometry; group: object | undefined }>;

const HISTORY_LIMIT = 100;

function geometryKey(project: Geometry): string {
  return JSON.stringify({ items: project.items, sheets: project.sheets }, (_key, value) =>
    value instanceof Length ? value.micrometres : value,
  );
}

/** Session-only canonical geometry history; source IO and viewport state stay outside. */
export class ProjectHistory {
  private past: Action[] = [];
  private future: Action[] = [];

  constructor(public project: Project) {}

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  record(next: Project, group?: object): Project {
    if (next.id !== this.project.id) throw new RangeError('cannot edit a different project');
    if (geometryKey(next) === geometryKey(this.project)) return this.project;
    const previous = this.past.at(-1);
    const action: Action = {
      before: group && previous?.group === group ? previous.before : this.geometry(),
      after: { items: next.items, sheets: next.sheets },
      group,
    };
    const restored = this.restore(action.after);
    if (group && previous?.group === group) this.past.pop();
    // A gesture that returns to its starting geometry creates no action.
    if (geometryKey(action.before) !== geometryKey(action.after)) this.past.push(action);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
    return restored;
  }

  undo(): Project {
    const action = this.past.at(-1);
    if (!action) return this.project;
    const restored = this.restore(action.before);
    this.past.pop();
    this.future.push(action);
    return restored;
  }

  redo(): Project {
    const action = this.future.at(-1);
    if (!action) return this.project;
    const restored = this.restore(action.after);
    this.future.pop();
    this.past.push(action);
    return restored;
  }

  updateSources(revalidated: Project): Project {
    if (revalidated.id !== this.project.id) return this.project;
    this.project = Project.create({
      id: this.project.id,
      ...this.geometry(),
      sources: revalidated.sources,
    });
    return this.project;
  }

  reset(project: Project): Project {
    this.project = project;
    this.past = [];
    this.future = [];
    return project;
  }

  private geometry(): Geometry {
    return { items: this.project.items, sheets: this.project.sheets };
  }

  private restore(geometry: Geometry): Project {
    this.project = Project.create({
      id: this.project.id,
      sources: this.project.sources,
      ...geometry,
    });
    return this.project;
  }
}
