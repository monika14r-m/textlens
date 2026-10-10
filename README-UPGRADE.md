# Applying the TextLens upgrade

This ZIP contains replacement/additional files for the existing `monika14r-m/textlens` repository. It does not contain your full source tree.

1. Download and extract the ZIP.
2. Copy the extracted `frontend/` and `backend/` folders into the root of your local TextLens clone, allowing the listed files to be overwritten.
3. Follow `README.md` for dependency installation and configuration.
4. Run both services and verify file upload, text comparison, AI analysis, and (after adding `OPENAI_API_KEY` locally) AI revision.
5. Commit the changes on a feature branch, review the diff, and then merge when you are satisfied.

The connected GitHub integration rejected branch creation and file writes with HTTP 403 in this session, so these are prepared files, not a commit already pushed to your repository.
