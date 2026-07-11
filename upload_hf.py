from huggingface_hub import HfApi

api = HfApi()

print("Uploading to Hugging Face Spaces using upload_large_folder...")
api.upload_large_folder(
    folder_path=".",
    repo_id="ibn-alazhar-docs/ibn-alazhar-docs",
    repo_type="space",
    ignore_patterns=[
        ".git/**",
        "node_modules/**",
        ".next/**",
        "playwright-report/**",
        "test-results/**",
        "test-data/**",
        "coverage/**",
        ".husky/**",
        ".repowise/**",
        ".ruff_cache/**",
        "tests/e2e/visual-regression.spec.ts-snapshots/**"
    ],
)
print("Upload complete!")
