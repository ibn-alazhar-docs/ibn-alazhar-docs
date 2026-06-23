export { DocumentCrudUseCases, documentCrudUseCases } from "./document-crud.use-cases";
export { DocumentMoveUseCases, documentMoveUseCases } from "./document-move.use-cases";
export { DocumentTagUseCases, documentTagUseCases } from "./document-tag.use-cases";
export { DocumentShareUseCases, documentShareUseCases } from "./document-share.use-cases";

import { documentCrudUseCases } from "./document-crud.use-cases";
import { documentMoveUseCases } from "./document-move.use-cases";
import { documentTagUseCases } from "./document-tag.use-cases";
import { documentShareUseCases } from "./document-share.use-cases";

class DocumentUseCases {
  get getDocuments() {
    return documentCrudUseCases.getDocuments.bind(documentCrudUseCases);
  }
  get getDocumentById() {
    return documentCrudUseCases.getDocumentById.bind(documentCrudUseCases);
  }
  get updateDocument() {
    return documentCrudUseCases.updateDocument.bind(documentCrudUseCases);
  }
  get deleteDocument() {
    return documentCrudUseCases.deleteDocument.bind(documentCrudUseCases);
  }
  get restoreDocument() {
    return documentCrudUseCases.restoreDocument.bind(documentCrudUseCases);
  }
  get moveDocument() {
    return documentMoveUseCases.moveDocument.bind(documentMoveUseCases);
  }
  get bulkMoveDocuments() {
    return documentMoveUseCases.bulkMoveDocuments.bind(documentMoveUseCases);
  }
  get getDocumentTags() {
    return documentTagUseCases.getDocumentTags.bind(documentTagUseCases);
  }
  get addTagToDocument() {
    return documentTagUseCases.addTagToDocument.bind(documentTagUseCases);
  }
  get setDocumentTags() {
    return documentTagUseCases.setDocumentTags.bind(documentTagUseCases);
  }
  get removeTagFromDocument() {
    return documentTagUseCases.removeTagFromDocument.bind(documentTagUseCases);
  }
  get bulkTagDocuments() {
    return documentTagUseCases.bulkTagDocuments.bind(documentTagUseCases);
  }
  get bulkUntagDocuments() {
    return documentTagUseCases.bulkUntagDocuments.bind(documentTagUseCases);
  }
  get getShareLink() {
    return documentShareUseCases.getShareLink.bind(documentShareUseCases);
  }
  get createShareLink() {
    return documentShareUseCases.createShareLink.bind(documentShareUseCases);
  }
  get regenerateShareLink() {
    return documentShareUseCases.regenerateShareLink.bind(documentShareUseCases);
  }
  get deleteShareLink() {
    return documentShareUseCases.deleteShareLink.bind(documentShareUseCases);
  }
}

export const documentUseCases = new DocumentUseCases();
