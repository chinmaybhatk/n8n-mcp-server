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

## Example Usage

Once configured, you can interact with Claude like this:

**You:** "Create a workflow that monitors a webhook, processes the data with a Code node to extract email addresses, and sends notifications via Slack."

**Claude will:**
1. Design the workflow structure
2. Create the appropriate nodes (Webhook, Code, Slack)
3. Configure the connections
4. Use the MCP server to create it in your n8n instance

## Security

- Never commit your `.env` file
- Store API keys securely
- Use environment variables for sensitive configuration

## License

ISC