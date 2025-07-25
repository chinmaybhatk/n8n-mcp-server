#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Configuration - reads from environment variables
const N8N_URL = process.env.N8N_URL || 'https://your-n8n-instance.com';
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
  timeout: 30000, // 30 second timeout
});

// Add request/response interceptors for debugging
n8nApi.interceptors.request.use(
  (config) => {
    console.error(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    if (process.env.DEBUG === 'true' && config.data) {
      console.error('[Request Data]', JSON.stringify(config.data, null, 2));
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

n8nApi.interceptors.response.use(
  (response) => {
    console.error(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`[API Response Error] ${error.response?.status} ${error.response?.statusText} - ${error.config?.url}`);
    if (error.response?.data) {
      console.error('[API Error Details]', JSON.stringify(error.response.data, null, 2));
    }
    return Promise.reject(error);
  }
);

class N8NMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'n8n-workflow-server',
        version: '1.0.2',
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
        const errorMessage = this.formatError(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private formatError(error: any): string {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const data = error.response?.data;
      
      let message = `HTTP ${status} ${statusText}`;
      
      if (data) {
        if (typeof data === 'string') {
          message += ` - ${data}`;
        } else if (data.message) {
          message += ` - ${data.message}`;
        } else if (data.error) {
          message += ` - ${data.error}`;
        } else {
          message += ` - ${JSON.stringify(data)}`;
        }
      }
      
      return message;
    }
    
    return error instanceof Error ? error.message : String(error);
  }

  private generateNodeId(): string {
    return crypto.randomBytes(16).toString('hex');
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
    // Ensure proper workflow structure for n8n API
    const workflowData = {
      name: args.name,
      nodes: args.nodes || [],
      connections: args.connections || {},
      active: args.active || false,
      settings: args.settings || { 
        executionOrder: 'v1',
        saveDataSuccessExecution: 'all',
        saveExecutionProgress: true,
        saveManualExecutions: true,
        callerPolicy: 'workflowsFromSameOwner'
      },
      staticData: {},
      meta: {
        instanceId: crypto.randomBytes(16).toString('hex')
      },
      pinData: {},
      tags: []
    };

    // Validate required fields
    if (!workflowData.name || !workflowData.nodes) {
      throw new Error('Workflow name and nodes are required');
    }

    // Validate nodes structure
    if (!Array.isArray(workflowData.nodes)) {
      throw new Error('Nodes must be an array');
    }

    // Process each node to ensure proper structure
    workflowData.nodes = workflowData.nodes.map((node: any, index: number) => {
      // Generate ID if not provided
      if (!node.id) {
        node.id = this.generateNodeId();
      }
      
      // Validate required fields
      if (!node.name) {
        throw new Error(`Node at index ${index} is missing required 'name' field`);
      }
      if (!node.type) {
        throw new Error(`Node at index ${index} is missing required 'type' field`);
      }
      
      // Set default typeVersion if not provided
      if (!node.typeVersion) {
        node.typeVersion = 1;
      }
      
      // Set default position if not provided
      if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
        node.position = [250 + (index * 250), 300];
      }
      
      // Ensure parameters object exists
      if (!node.parameters) {
        node.parameters = {};
      }
      
      // Add default properties
      node.disabled = node.disabled || false;
      node.notesInFlow = node.notesInFlow || false;
      
      return node;
    });

    // Process connections to ensure they reference nodes by name
    const processedConnections: any = {};
    
    if (workflowData.connections && typeof workflowData.connections === 'object') {
      for (const [nodeName, nodeConnections] of Object.entries(workflowData.connections)) {
        if (typeof nodeConnections === 'object' && nodeConnections !== null) {
          processedConnections[nodeName] = nodeConnections;
        }
      }
    }
    
    workflowData.connections = processedConnections;

    console.error('[Creating Workflow]', JSON.stringify(workflowData, null, 2));

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
    
    // Get existing workflow first to preserve required fields
    const existingResponse = await n8nApi.get(`/workflows/${id}`);
    const existingWorkflow = existingResponse.data;
    
    // Process nodes if provided
    if (updateData.nodes && Array.isArray(updateData.nodes)) {
      updateData.nodes = updateData.nodes.map((node: any, index: number) => {
        // Generate ID if not provided
        if (!node.id) {
          node.id = this.generateNodeId();
        }
        
        // Set defaults
        if (!node.typeVersion) {
          node.typeVersion = 1;
        }
        
        if (!node.position || !Array.isArray(node.position)) {
          node.position = [250 + (index * 250), 300];
        }
        
        if (!node.parameters) {
          node.parameters = {};
        }
        
        node.disabled = node.disabled || false;
        node.notesInFlow = node.notesInFlow || false;
        
        return node;
      });
    }
    
    // Merge with existing data
    const workflowData = {
      ...existingWorkflow,
      ...updateData,
      // Ensure these fields are preserved/set correctly
      settings: updateData.settings || existingWorkflow.settings || { 
        executionOrder: 'v1',
        saveDataSuccessExecution: 'all',
        saveExecutionProgress: true,
        saveManualExecutions: true,
        callerPolicy: 'workflowsFromSameOwner'
      },
      staticData: existingWorkflow.staticData || {},
      meta: existingWorkflow.meta || {
        instanceId: crypto.randomBytes(16).toString('hex')
      },
      pinData: existingWorkflow.pinData || {},
      tags: updateData.tags || existingWorkflow.tags || []
    };

    const response = await n8nApi.put(`/workflows/${id}`, workflowData);
    
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
    // n8n uses PATCH for activation
    try {
      const response = await n8nApi.patch(`/workflows/${args.id}`, {
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
    } catch (error) {
      // If that fails with 405, try the alternative endpoint
      if (error instanceof AxiosError && error.response?.status === 405) {
        // Try alternative activation method
        const workflow = await n8nApi.get(`/workflows/${args.id}`);
        workflow.data.active = args.active;
        const response = await n8nApi.put(`/workflows/${args.id}`, workflow.data);
        
        return {
          content: [
            {
              type: 'text',
              text: `Workflow ${args.active ? 'activated' : 'deactivated'} successfully!\n${JSON.stringify(response.data, null, 2)}`,
            },
          ],
        };
      }
      throw error;
    }
  }

  private async executeWorkflow(args: any) {
    // Try different execution endpoints
    const executionData = {
      workflowData: args.data || {},
    };

    try {
      // Try the standard execution endpoint
      const response = await n8nApi.post(`/workflows/${args.id}/execute`, executionData);
      
      return {
        content: [
          {
            type: 'text',
            text: `Workflow execution started!\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      // If that fails, try alternative endpoint
      if (error instanceof AxiosError && (error.response?.status === 404 || error.response?.status === 405)) {
        const response = await n8nApi.post(`/workflows/run`, {
          workflowId: args.id,
          ...executionData,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Workflow execution started!\n${JSON.stringify(response.data, null, 2)}`,
            },
          ],
        ];
      }
      throw error;
    }
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
    console.error('N8N MCP server running on stdio (v1.0.2)');
  }
}

const server = new N8NMCPServer();
server.run().catch(console.error);