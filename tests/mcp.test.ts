import { describe, it, expect, beforeAll } from 'vitest';
import { createMcpServer } from '../src/mcp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

describe('MCP Server Integration Tests', () => {
  let server: Server;

  beforeAll(() => {
    server = createMcpServer();
  });

  it('lists available WCAG tools including situations', async () => {
    const handler = (server as any)._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
    expect(handler).toBeDefined();

    const res = await handler({ method: 'tools/list', params: {} });
    expect(res.tools).toBeDefined();
    const toolNames = res.tools.map((t: any) => t.name);
    expect(toolNames).toContain('wcag_tree');
    expect(toolNames).toContain('wcag_list_criteria');
    expect(toolNames).toContain('wcag_get_criterion');
    expect(toolNames).toContain('wcag_list_situations');
    expect(toolNames).toContain('wcag_get_situation');
    expect(toolNames).toContain('wcag_get_failures');
    expect(toolNames).toContain('wcag_get_technique');
    expect(toolNames).toContain('wcag_search');
  });

  it('executes "wcag_get_criterion" tool call with situation filter', async () => {
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);
    expect(handler).toBeDefined();

    const res = await handler({
      method: 'tools/call',
      params: {
        name: 'wcag_get_criterion',
        arguments: { id: '1.1.1', situation: 'F', format: 'json' },
      },
    });

    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.num).toBe('1.1.1');
    expect(parsed.selectedSituation).toBe('F');
    expect(parsed.techniquesList.length).toBeGreaterThan(0);
  });

  it('executes "wcag_list_situations" tool call', async () => {
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);
    const res = await handler({
      method: 'tools/call',
      params: {
        name: 'wcag_list_situations',
        arguments: { id: '1.1.1', format: 'json' },
      },
    });

    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(6);
    expect(parsed.map((s: any) => s.letter)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('executes "wcag_get_situation" tool call', async () => {
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);
    const res = await handler({
      method: 'tools/call',
      params: {
        name: 'wcag_get_situation',
        arguments: { criterionId: '1.1.1', letter: 'F', format: 'json' },
      },
    });

    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.id).toBe('1.1.1-F');
    expect(parsed.letter).toBe('F');
  });

  it('executes "wcag_search" tool call', async () => {
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);
    const res = await handler({
      method: 'tools/call',
      params: {
        name: 'wcag_search',
        arguments: { query: 'dragging', format: 'json', limit: 2 },
      },
    });

    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].num).toBe('2.5.7');
  });

  it('executes "wcag_tree" with level filter', async () => {
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);
    const res = await handler({
      method: 'tools/call',
      params: {
        name: 'wcag_tree',
        arguments: { level: 'AAA', format: 'json' },
      },
    });

    expect(res.content).toHaveLength(1);
    const parsed = JSON.parse(res.content[0].text);
    expect(Array.isArray(parsed)).toBe(true);
    for (const p of parsed) {
      for (const g of p.guidelines) {
        for (const sc of g.successcriteria) {
          expect(sc.level).toBe('AAA');
        }
      }
    }
  });

  it('returns isError: true for invalid criterion lookup', async () => {
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);
    const res = await handler({
      method: 'tools/call',
      params: {
        name: 'wcag_get_criterion',
        arguments: { id: '9.9.9' },
      },
    });

    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Criterion not found: "9.9.9"');
  });

  it('returns isError: true for invalid situation lookup', async () => {
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);
    const res = await handler({
      method: 'tools/call',
      params: {
        name: 'wcag_get_situation',
        arguments: { criterionId: '1.1.1', letter: 'Z' },
      },
    });

    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Situation "Z" for criterion "1.1.1" not found');
  });
});
