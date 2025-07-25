# Example Workflow Creation Requests

This document provides examples of how to use the n8n MCP server to create workflows.

## Simple HTTP Request Workflow

Ask Claude:
```
Create an n8n workflow with:
- A webhook trigger that accepts POST requests
- A Code node that processes the incoming data
- An HTTP Request node that sends the processed data to an API
```

## Data Processing Pipeline

Ask Claude:
```
Create a workflow that:
1. Triggers every hour
2. Fetches data from a REST API
3. Transforms the data using a Code node
4. Stores the results in Google Sheets
```

## Email Automation

Ask Claude:
```
Build a workflow that monitors Gmail for new emails with "invoice" in the subject, 
extracts attachment information, and sends a Slack notification with the details.
```

## Database Integration

Ask Claude:
```
Create a workflow that:
- Accepts webhook data
- Validates the input using a Code node
- Inserts the data into a PostgreSQL database
- Sends a success/failure response
```

## Complex Multi-Step Workflow

Ask Claude:
```
Design a customer onboarding workflow:
1. Webhook receives new customer data
2. Validate and enrich the data
3. Create records in CRM (HubSpot)
4. Send welcome email
5. Add to mailing list (Mailchimp)
6. Notify sales team on Slack
```

## Notes for Claude/MCP Usage

1. **No need to specify node IDs** - The server auto-generates them
2. **No need to specify positions** - The server sets intelligent defaults
3. **No need to specify typeVersion** - Defaults to 1
4. **Connections use node names** - Just reference nodes by their names

## Example Response Structure

When Claude creates a workflow, it will use this structure:

```json
{
  "name": "My Workflow",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "webhook-path",
        "method": "POST"
      }
    },
    {
      "name": "Code",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Process data\nreturn items;"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Code",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## Troubleshooting

If workflow creation fails:

1. Enable debug mode in `.env`:
   ```
   DEBUG=true
   ```

2. Check the console output for detailed error messages

3. Verify your n8n API key has the required permissions

4. Ensure your n8n instance is accessible at the configured URL