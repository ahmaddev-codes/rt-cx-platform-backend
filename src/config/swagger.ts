import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "RT-CX Platform API",
      version: "1.0.0",
      description:
        "Real-time Customer Experience Platform - Intelligent feedback collection and sentiment analysis",
      contact: {
        name: "API Support",
        email: "api@rt-cx.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Development server",
      },
      {
        url: "https://rt-cx-platform-backend-production.up.railway.app",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "error",
            },
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  example: "VALIDATION_ERROR",
                },
                message: {
                  type: "string",
                  example: "Invalid input data",
                },
                details: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: "Auth",
        description: "Authentication and authorization",
      },
      {
        name: "Users",
        description: "User management",
      },
      {
        name: "Feedback",
        description: "Feedback collection and retrieval",
      },
      {
        name: "Sentiment",
        description: "Sentiment analysis",
      },
      {
        name: "Dashboard",
        description: "Dashboard metrics and analytics",
      },
      {
        name: "Alerts",
        description: "Alert management",
      },
      {
        name: "Topics",
        description: "Topic management",
      },
    ],
  },
  apis: [
    "./src/routes/*.ts",
    "./src/controllers/*.ts",
    "./dist/routes/*.js",
    "./dist/controllers/*.js",
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
