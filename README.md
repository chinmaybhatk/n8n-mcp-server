# N8N MCP Server

Model Context Protocol (MCP) server for managing n8n workflows. This allows Claude and other MCP-compatible tools to create, read, update, and delete workflows in your n8n instance.

## Features

- 📋 List all workflows
- 📖 Get workflow details
- ✏️ Create new workflows  
- 🔄 Update existing workflows
- 🗑️ Delete workflows
- ▶️ Execute workflows
- 📊 View execution history
- 🔄 Activate/deactivate workflows

## Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/chinmaybhatk/n8n-mcp-server.git
   cd n8n-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your n8n credentials:
   ```
   N8N_URL=https://your-n8n-instance.com
   N8N_API_KEY=your_api_key_here
   ```

5. Build the project:
   ```bash
   npm run build
   ```

## Getting n8n API Key

1. In your n8n instance, go to **Settings** > **API**
2. Create a new API key with the following permissions:
   - `workflow:create`
   - `workflow:read`
   - `workflow:update`
   - `workflow:delete`
   - `workflow:execute`
   - `execution:read`

## Usage

### With Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["/path/to/n8n-mcp-server/build/index.js"],
      "env": {
        "N8N_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Development

Run in development mode:
```bash
npm run dev
```

## Available Tools

- `list_workflows` - List all workflows with optional active filter
- `get_workflow` - Get detailed workflow information by ID
- `create_workflow` - Create a new workflow with nodes and connections
- `update_workflow` - Update an existing workflow
- `delete_workflow` - Delete a workflow by ID
- `activate_workflow` - Activate or deactivate a workflow
- `execute_workflow` - Manually execute a workflow
- `get_executions` - Get workflow execution history

## Troubleshooting

### Common Issues

**400 Bad Request when creating workflows:**
- The server now automatically generates node IDs if not provided
- Default positions are set for nodes without positions
- Default typeVersion is set to 1 if not specified
- Ensure node names and types are provided

**Authentication Errors:**
- Verify your N8N_API_KEY is correct and has proper permissions
- Ensure your N8N_URL is accessible and includes the protocol (https://)
- Check that the API key hasn't expired

**Network Timeouts:**
- The server includes a 30-second timeout for API requests
- For large workflows, consider breaking them into smaller parts

**405 Method Not Allowed:**
- The server includes fallback methods for activation and execution
- For activation, it will try updating the entire workflow if PATCH fails

### Debug Mode

Enable debug mode by setting `DEBUG=true` in your `.env` file:
```
DEBUG=true
```

This will log request/response data for troubleshooting.

### Testing API Connection

You can test your n8n API connection manually:

```bash
curl -H "X-N8N-API-KEY: your_api_key" https://your-n8n-instance.com/api/v1/workflows
```

## Recent Updates (v1.0.2)

- ✅ Auto-generate node IDs when not provided
- ✅ Set intelligent default positions for nodes
- ✅ Auto-set typeVersion to 1 if not specified
- ✅ Enhanced workflow settings with proper defaults
- ✅ Improved activation endpoint with fallback method
- ✅ Added debug mode for request/response logging
- ✅ Better error messages with full response data

## Recent Updates (v1.0.1)

- ✅ Fixed workflow creation payload structure
- ✅ Added comprehensive error handling and logging
- ✅ Improved node validation before creation
- ✅ Added fallback endpoints for different n8n versions
- ✅ Better error messages for troubleshooting
- ✅ Preserved existing workflow data during updates
- ✅ Increased API timeout to 30 seconds

## Example Usage

Once configured, you can interact with Claude like this:

**You:** "Create a workflow that monitors a webhook, processes the data with a Code node to extract email addresses, and sends notifications via Slack."

**Claude will:**
1. Design the workflow structure
2. Create the appropriate nodes (Webhook, Code, Slack)
3. Configure the connections
4. Use the MCP server to create it in your n8n instance

**Note:** You don't need to specify node IDs or positions - the server handles these automatically!

## Security

- Never commit your `.env` file
- Store API keys securely
- Use environment variables for sensitive configuration
- Ensure your n8n instance is properly secured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC