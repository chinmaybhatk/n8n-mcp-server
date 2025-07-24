#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration - reads from environment variables
const N8N_URL = process.env.N8N_URL || 'https://n8n.waluelab.com';
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error('N8N_API_KEY environment variable is required');
  process.exit(1);
}

// Create axios instance with default config
const n8nApi = axios.create({
  baseURL: `${N8N_URL}/api/v1`,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json',
  },
});

class N8NMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'n8n-workflow-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_workflows',
            description: 'List all workflows in n8n',
            inputSchema: {
              type: 'object',
              properties: {
                active: {
                  type: 'boolean',
                  description: 'Filter by active status',
                },
              },
            },
          },
          {
            name: 'get_workflow',
            description: 'Get a specific workflow by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Workflow ID',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'create_workflow',
            description: 'Create a new workflow in n8n',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Workflow name',
                },
                nodes: {
                  type: 'array',
                  description: 'Array of workflow nodes',
                },
                connections: {
                  type: 'object',
                  description: 'Node connections object',
                },
                active: {
                  type: 'boolean',
                  description: 'Whether workflow should be active',
                  default: false,
                },
                settings: {
                  type: 'object',
                  description: 'Workflow settings',
                },
              },
              required: ['name', 'nodes'],
            },
          },
          {
            name: 'update_workflow',
            description: 'Update an existing workflow',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Workflow ID',
                },
                name: {
                  type: 'string',
                  description: 'Workflow name',
                },
                nodes: {
                  type: 'array',
                  description: 'Array of workflow nodes',
                },
                connections: {
                  type: 'object',
                  description: 'Node connections object',
                },
                active: {
                  type: 'boolean',
                  description: 'Whether workflow should be active',
                },
                settings: {
                  type: 'object',
                  description: 'Workflow settings',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'delete_workflow',
            description: 'Delete a workflow',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Workflow ID',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'activate_workflow',
            description: 'Activate/deactivate a workflow',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Workflow ID',
                },
                active: {
                  type: 'boolean',
                  description: 'Active status',
                },
              },
              required: ['id', 'active'],
            },
          },
          {
            name: 'execute_workflow',
            description: 'Execute a workflow manually',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Workflow ID',
                },
                data: {
                  type: 'object',
                  description: 'Input data for workflow execution',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'get_executions',
            description: 'Get workflow execution history',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'Workflow ID',
                },
                limit: {
                  type: 'number',
                  description: 'Number of executions to return',
                  default: 20,
                },
              },
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_workflows':
            return await this.listWorkflows(args);
          case 'get_workflow':
            return await this.getWorkflow(args);
          case 'create_workflow':
            return await this.createWorkflow(args);
          case 'update_workflow':
            return await this.updateWorkflow(args);
          case 'delete_workflow':
            return await this.deleteWorkflow(args);
          case 'activate_workflow':
            return await this.activateWorkflow(args);
          case 'execute_workflow':
            return await this.executeWorkflow(args);
          case 'get_executions':
            return await this.getExecutions(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async listWorkflows(args: any) {
    const params = args.active !== undefined ? { active: args.active } : {};
    const response = await n8nApi.get('/workflows', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getWorkflow(args: any) {
    const response = await n8nApi.get(`/workflows/${args.id}`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createWorkflow(args: any) {
    const workflowData = {
      name: args.name,
      nodes: args.nodes,
      connections: args.connections || {},
      active: args.active || false,
      settings: args.settings || {},
    };

    const response = await n8nApi.post('/workflows', workflowData);
    
    return {
      content: [
        {
          type: 'text',
          text: `Workflow created successfully!\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async updateWorkflow(args: any) {
    const { id, ...updateData } = args;
    const response = await n8nApi.put(`/workflows/${id}`, updateData);
    
    return {
      content: [
        {
          type: 'text',
          text: `Workflow updated successfully!\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async deleteWorkflow(args: any) {
    await n8nApi.delete(`/workflows/${args.id}`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Workflow ${args.id} deleted successfully!`,
        },
      ],
    };
  }

  private async activateWorkflow(args: any) {
    const response = await n8nApi.patch(`/workflows/${args.id}/activate`, {
      active: args.active,
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `Workflow ${args.active ? 'activated' : 'deactivated'} successfully!\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async executeWorkflow(args: any) {
    const response = await n8nApi.post(`/workflows/${args.id}/execute`, {
      data: args.data || {},
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `Workflow execution started!\n${JSON.stringify(response.data, null, 2)}`,
        },
      ],
    };
  }

  private async getExecutions(args: any) {
    const params: any = {
      limit: args.limit || 20,
    };
    
    if (args.workflowId) {
      params.workflowId = args.workflowId;
    }

    const response = await n8nApi.get('/executions', { params });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('N8N MCP server running on stdio');
  }
}

const server = new N8NMCPServer();
server.run().catch(console.error);