This client is a pass-through client that routes websocket data
through to both the basic client (which backs this client) as well
as any "app" that is bound to this client. Particularly useful
for things like web clients, where the web part is UI-only, and
the client should be independent and thin.
