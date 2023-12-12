export const ErrorTypes = {
  DefaultServer: 'Unknown server error. Please try back later.',
  DefaultClient: "Unknown browser error. Please try back later",
  NoAuth: "Unauthorized User",
  BlockedAction: "Action not permitted",
  MissingFields: 'Missing required fields',
  // FailedQuery: 'Unable to query resource',
  // SheetNameError: 'A sheet already exists with that name'
} as const