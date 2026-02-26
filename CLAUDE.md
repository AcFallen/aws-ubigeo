# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A minimal AWS Lambda HTTP API built with the Serverless Framework v4, Node.js 20.x, and API Gateway (HTTP API v2). Single GET endpoint at `/` returning a JSON response.

## Commands

**Local development** (tunnels to AWS Lambda, no redeploy needed):
```bash
serverless dev
```

**Deploy to AWS**:
```bash
serverless deploy
```

**Invoke deployed endpoint**:
```bash
curl https://<your-api-id>.execute-api.us-east-1.amazonaws.com/
```

## Architecture

```
HTTP GET /
  → API Gateway (HTTP API v2)
    → Lambda: handler.hello (handler.js)
      → Returns { statusCode: 200, body: JSON }
```

- **Service**: `aws-ubigeo` (Serverless org: `fallen`, app: `ubigeo-aws`)
- **Runtime**: Node.js 20.x, deployed to `us-east-1` by default
- **No persistence**: Stateless function only
- **API is public** by default — add an authorizer before production use

## Adding Functions

New Lambda functions go in [handler.js](handler.js) and must be registered in [serverless.yml](serverless.yml) under the `functions` key with their corresponding `httpApi` event.
