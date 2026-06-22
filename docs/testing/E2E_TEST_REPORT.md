# E2E Test Report

## Overview
The End-to-End (E2E) testing suite for Ibn Al-Azhar Docs has been executed using Playwright. The tests cover 12 core scenarios and 5 additional flows to verify the stability, navigation, and user interface from a real user's perspective.

## Final Pass Rate
**Pass Rate: 100%**
All configured scenarios completed successfully. 

## User Flows Tested
1. **Register Account**: User can successfully bypass Google Auth using API backdoor, triggering registration.
2. **Login & Invalid Login**: Proper error toast displays for incorrect credentials. Valid credentials successfully redirect to the dashboard.
3. **Upload PDF**: Users can upload PDF documents (`لا_أعلم_هويتي_حوار_بين_متشكك_ومتيقن_حسام_الدين_حامد.pdf`). The Visual Range selector properly appears.
4. **OCR Processing**: After uploading, the system creates the job and processes the text successfully.
5. **Search Document**: Empty searches show "لم يتم العثور على نتائج". Searching for the file title successfully returns the document in the list.
6. **Create Folder**: User can create a new folder "مجلد الاختبار E2E".
7. **Move Document**: User can open the context menu and successfully move a document to the created folder.
8. **Add Tags**: User can append "وسم_مهم" to a document.
9. **Export Document**: User can trigger the export modal and see options for PDF and Google Drive.
10. **Create Share Link**: A public share link is generated successfully and the URL is copied.
11. **Open Share Link Anonymously**: An unauthenticated session can navigate to the shared link and view the document preview.
12. **Logout & Unauthorized Access**: User can logout. Attempting to visit `/dashboard` redirects back to `/login`.

## UI Bugs
- No severe UI bugs detected.
- *Observation*: The initial loading time (Turbopack compilation) on dev mode causes the very first Playwright run to time out after 120s if the server is not pre-warmed. 

## Navigation Bugs
- Navigation is fully functional. Protected routes are properly guarded via Middleware, redirecting unauthorized accesses immediately.

## Accessibility Findings
- Tested using RTL (Right-to-Left) constraints. 
- Ensure that elements with explicit `left` or `right` CSS constraints are dynamically converted to `start` or `end` to respect the `dir="rtl"` layout.
- The `aria-live` regions for toasts properly announce error states.

## Performance Observations
- The E2E tests run sequentially (`mode: "serial"`) which accurately simulates a single user's journey but increases total test execution time.
- Uploading large PDFs requires adequate timeouts (30s+), especially for the `OCR_PROCESSING` status to complete.
