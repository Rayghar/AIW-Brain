import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  architectureProjectSchema,
  enterpriseArchitectureCatalogSchema,
  sampleEnterpriseCatalog,
  samplePortfolioProjects,
} from "@aiw/domain";
import {
  aggregatePortfolioCosts,
  analyseBuildingBlockReuse,
  analyseEnterpriseStandardsImpact,
  analyseTechnologyStandardization,
  buildPortfolioDependencyGraph,
  buildPortfolioIntelligence,
  buildPortfolioRiskHeatmap,
  buildPortfolioVisualModel,
  evaluateReferenceArchitectureCompliance,
} from "@aiw/engine";
import { principalFor } from "../appRuntimeSupport.js";

export async function portfolioRoutes(app: FastifyInstance) {
  app.get("/api/portfolio/catalog", async (request, reply) => {
    const principal = principalFor(request);
    if (principal.tenantId !== sampleEnterpriseCatalog.tenantId)
      return reply.code(404).send({ error: "PORTFOLIO_CATALOG_NOT_FOUND" });
    return sampleEnterpriseCatalog;
  });
  app.get("/api/portfolio/projects", async (request) => {
    const principal = principalFor(request);
    return samplePortfolioProjects.filter(
      (project) => project.tenantId === principal.tenantId,
    );
  });
  app.post("/api/portfolio/analyze", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        projects: z.array(architectureProjectSchema).optional(),
        catalog: enterpriseArchitectureCatalogSchema.optional(),
      })
      .safeParse(request.body ?? {});
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_PORTFOLIO_ANALYSIS_REQUEST" });
    const projects = (parsed.data.projects ?? samplePortfolioProjects).filter(
      (project) => project.tenantId === principal.tenantId,
    );
    const catalog = parsed.data.catalog ?? sampleEnterpriseCatalog;
    if (catalog.tenantId !== principal.tenantId)
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    return buildPortfolioIntelligence(projects, catalog);
  });
  app.post("/api/portfolio/dependencies", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({ projects: z.array(architectureProjectSchema) })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_PORTFOLIO_REQUEST" });
    return buildPortfolioDependencyGraph(
      parsed.data.projects.filter(
        (project) => project.tenantId === principal.tenantId,
      ),
    );
  });
  app.post("/api/portfolio/standards", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        projects: z.array(architectureProjectSchema),
        catalog: enterpriseArchitectureCatalogSchema,
      })
      .safeParse(request.body);
    if (!parsed.success || parsed.data.catalog.tenantId !== principal.tenantId)
      return reply.code(400).send({ error: "INVALID_STANDARDIZATION_REQUEST" });
    return analyseTechnologyStandardization(
      parsed.data.projects.filter(
        (project) => project.tenantId === principal.tenantId,
      ),
      parsed.data.catalog,
    );
  });
  app.post("/api/portfolio/risk", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({ projects: z.array(architectureProjectSchema) })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_PORTFOLIO_REQUEST" });
    return buildPortfolioRiskHeatmap(
      parsed.data.projects.filter(
        (project) => project.tenantId === principal.tenantId,
      ),
    );
  });
  app.post("/api/portfolio/costs", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({ projects: z.array(architectureProjectSchema) })
      .safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: "INVALID_PORTFOLIO_REQUEST" });
    return aggregatePortfolioCosts(
      parsed.data.projects.filter(
        (project) => project.tenantId === principal.tenantId,
      ),
    );
  });
  app.post("/api/portfolio/compliance", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        projects: z.array(architectureProjectSchema),
        catalog: enterpriseArchitectureCatalogSchema,
      })
      .safeParse(request.body);
    if (!parsed.success || parsed.data.catalog.tenantId !== principal.tenantId)
      return reply.code(400).send({ error: "INVALID_COMPLIANCE_REQUEST" });
    return evaluateReferenceArchitectureCompliance(
      parsed.data.projects.filter(
        (project) => project.tenantId === principal.tenantId,
      ),
      parsed.data.catalog,
    );
  });
  app.post("/api/portfolio/reuse", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        projects: z.array(architectureProjectSchema),
        catalog: enterpriseArchitectureCatalogSchema,
      })
      .safeParse(request.body);
    if (!parsed.success || parsed.data.catalog.tenantId !== principal.tenantId)
      return reply.code(400).send({ error: "INVALID_REUSE_REQUEST" });
    return analyseBuildingBlockReuse(
      parsed.data.projects.filter(
        (project) => project.tenantId === principal.tenantId,
      ),
      parsed.data.catalog,
    );
  });

  app.post("/api/portfolio/visual-model", async (request, reply) => {
    const principal = principalFor(request);
    const parsed = z
      .object({
        projects: z.array(architectureProjectSchema).optional(),
        catalog: enterpriseArchitectureCatalogSchema.optional(),
        focusProjectIds: z.array(z.string()).optional(),
      })
      .safeParse(request.body ?? {});
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_PORTFOLIO_VISUAL_MODEL_REQUEST" });
    const projects = (parsed.data.projects ?? samplePortfolioProjects).filter(
      (project) => project.tenantId === principal.tenantId,
    );
    const catalog = parsed.data.catalog ?? sampleEnterpriseCatalog;
    if (catalog.tenantId !== principal.tenantId)
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    const report = buildPortfolioIntelligence(projects, catalog);
    return {
      report,
      visualModel: buildPortfolioVisualModel(
        projects,
        catalog,
        report,
        parsed.data.focusProjectIds ?? [],
      ),
    };
  });
  app.post("/api/portfolio/standards-impact", async (request, reply) => {
    const principal = principalFor(request);
    const standardChangeSchema = z.object({
      id: z.string().min(1),
      standardId: z.string().min(1),
      changeType: z.enum([
        "deprecate",
        "prohibit",
        "restrict",
        "replace",
        "approve",
        "retire-exception",
      ]),
      targetStatus: z
        .enum([
          "preferred",
          "allowed",
          "restricted",
          "prohibited",
          "deprecated",
        ])
        .optional(),
      replacementTechnology: z.string().optional(),
      effectiveFrom: z.string().min(1),
      rationale: z.string().min(1),
    });
    const parsed = z
      .object({
        projects: z.array(architectureProjectSchema).optional(),
        catalog: enterpriseArchitectureCatalogSchema.optional(),
        standardChange: standardChangeSchema,
      })
      .safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send({ error: "INVALID_STANDARDS_IMPACT_REQUEST" });
    const projects = (parsed.data.projects ?? samplePortfolioProjects).filter(
      (project) => project.tenantId === principal.tenantId,
    );
    const catalog = parsed.data.catalog ?? sampleEnterpriseCatalog;
    if (catalog.tenantId !== principal.tenantId)
      return reply.code(403).send({ error: "TENANT_BOUNDARY_VIOLATION" });
    try {
      return analyseEnterpriseStandardsImpact(
        projects,
        catalog,
        parsed.data.standardChange,
      );
    } catch (error) {
      return reply
        .code(404)
        .send({
          error: error instanceof Error ? error.message : "STANDARD_NOT_FOUND",
        });
    }
  });
}
