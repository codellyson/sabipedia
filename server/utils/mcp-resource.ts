export function mcpResourceUrl(env: Pick<Env, 'BETTER_AUTH_URL' | 'MCP_RESOURCE_URL'>) {
  return env.MCP_RESOURCE_URL || new URL('/api/mcp', env.BETTER_AUTH_URL).toString()
}
