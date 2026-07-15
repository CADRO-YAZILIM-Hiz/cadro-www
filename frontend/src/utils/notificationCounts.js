export const getNotificationBadgeMap = (details = {}, canViewRequestForms = true) => ({
  leaves: details.pending_leaves || 0,
  expenses: details.pending_expenses || 0,
  dossier: details.pending_documents || 0,
  purchaseRequests: details.pending_purchase_requests || 0,
  knowledgeBase: details.pending_policy_acknowledgements || 0,
  helpdesk: details.open_tickets || 0,
  requestForms: canViewRequestForms
    ? (details.open_generic_requests || 0) + (details.health_record_corrections || 0)
    : 0,
});

export const getNotificationTotal = (details = {}, canViewRequestForms = true) => {
  const badges = getNotificationBadgeMap(details, canViewRequestForms);
  return Object.values(badges).reduce((sum, value) => sum + Number(value || 0), 0);
};

