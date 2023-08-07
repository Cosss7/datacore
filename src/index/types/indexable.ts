import { Link } from "expression/link";
import { DateTime } from "luxon";
import { Field } from "./field";

/** Any indexable field, which must have a few index-relevant properties. */
export interface Indexable {
    /** The object types that this indexable is. */
    $types: string[];
    /** Textual description of the object, such as `Page` or `Section`. Used in visualizations. */
    $typename: string;
    /** The unique index ID for this object. */
    $id: string;
    /**
     * The unique index ID for the parent of this object. If present, when the parent is removed, the child will also
     * be removed.
     */
    $parent?: string;
    /** If present, the revision in the index of this object. */
    $revision?: number;
    /** The file that this indexable was derived from, if file-backed. */
    $file?: string;
}

/** Metadata for objects which support linking. */
export const LINKABLE_TYPE = "linkable";
export interface Linkable {
    /** A link to this linkable object. */
    link: Link;
}

/** General metadata for any file. */
export const FILE_TYPE = "file";
export interface File extends Linkable {
    /** The path this file exists at. */
    path: string;
    /** Obsidian-provided date this page was created. */
    ctime: DateTime;
    /** Obsidian-provided date this page was modified. */
    mtime: DateTime;
    /** Obsidian-provided size of this page in bytes. */
    size: number;
    /** The extension of the file. */
    extension: string;
}

/** Metadata for taggable objects. */
export const TAGGABLE_TYPE = "taggable";
export interface Taggable {
    /** The exact set of tags on this object. (#a/b/c or #foo/bar). */
    tags: Set<string>;
}

/** Metadata for objects which can link to other things. */
export const LINKBEARING_TYPE = "links";
export interface Linkbearing {
    /** The links in this file. */
    links: Link[];
}

/** Metadata for objects which are annotated with fields. */
export const Fieldbearing = "fields";
export interface Fieldbearing {
    /** Return a list of all fields. This may be computed eagerly, so cache this value for repeated operations. */
    fields: Field[];

    /** Fetch a field with the given name if it is present on this object. */
    field(key: string): Field | undefined;
}