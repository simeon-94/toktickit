// Dashboard drill-down targets (ui-spec section 0): the app has no URL router, so a drill-down is a
// view name plus the filter the target list sends to the API (api-spec section 10, spec CL-01/CL-02).
export type ActionView = "myPlanned" | "openFollowUps";

export type DrillDown =
  | { view: "staffQueue"; filters: Record<string, string>; label: string }
  | { view: "staffActions"; actionView: ActionView; label: string }
  | { view: "myTickets"; filters?: Record<string, string>; label?: string }
  | { view: "adminUsers" }
  | { view: "createTicket" };

export interface ListFilter {
  filters: Record<string, string>;
  label: string;
}
