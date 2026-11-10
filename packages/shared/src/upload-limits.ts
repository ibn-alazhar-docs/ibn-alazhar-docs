// Single source of truth for upload-size fallbacks (FR-008 lens B).
// PARITY: values unchanged — do not "unify" them.
// - DEFAULT_MAX_UPLOAD_SIZE_MB is the web validator + client default (50).
// - PIPELINE_FALLBACK_MAX_UPLOAD_SIZE_MB is the pipeline fallback (100).
// An explicit MAX_UPLOAD_SIZE_MB env var overrides both at runtime;
// .env.example documents a 2048 example override (not a code fallback).
export const DEFAULT_MAX_UPLOAD_SIZE_MB = 50;
export const PIPELINE_FALLBACK_MAX_UPLOAD_SIZE_MB = 100;
