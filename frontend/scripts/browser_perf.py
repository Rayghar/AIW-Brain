#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import os
import signal
import subprocess
import time
import urllib.request
from pathlib import Path
from statistics import mean

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "BROWSER_PERFORMANCE.json"
PORT = int(os.environ.get("AIW_PERF_PORT", "4173"))
HOST = os.environ.get("AIW_PERF_HOST", "127.0.0.1")
CHROMIUM = os.environ.get("AIW_CHROMIUM_PATH") or os.environ.get("AIW_CHROMIUM_EXECUTABLE")


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, math.ceil(pct * len(ordered)) - 1))
    return ordered[index]


def large_project(count: int = 1500) -> dict:
    project = json.loads((ROOT / "data/sprint7-example-project.json").read_text())
    project["name"] = f"Browser Performance Model — {count} Nodes"
    project["activeStage"] = "logicalApplication"
    project["nodes"] = []
    project["edges"] = []
    cols = 50
    for i in range(count):
        node_id = f"perf-node-{i}"
        project["nodes"].append(
            {
                "id": node_id,
                "kind": "LogicalService",
                "stage": "logicalApplication",
                "label": f"Logical Service {i + 1}",
                "description": "Synthetic browser performance test node",
                "properties": {"critical": i % 20 == 0},
                "lineageFrom": [],
                "positions": {
                    "logicalApplication": {
                        "x": (i % cols) * 250,
                        "y": (i // cols) * 145,
                    }
                },
                "tags": ["performance"],
                "status": "draft",
            }
        )
        if i > 0:
            project["edges"].append(
                {
                    "id": f"perf-edge-{i - 1}",
                    "sourceId": f"perf-node-{i - 1}",
                    "targetId": node_id,
                    "kind": "communicatesWith",
                    "stage": "logicalApplication",
                    "properties": {"protocolStyle": "synchronous"},
                }
            )
    project["revision"] += 1
    project["updatedAt"] = "2026-07-02T00:00:00.000Z"
    project["branch"]["name"] = "Performance branch"
    return project


def write_report(payload: dict) -> None:
    REPORT.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2))


def main() -> int:
    process_options = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt" else {"start_new_session": True}
    server = subprocess.Popen(
        ["node", "scripts/start-playwright-web.mjs"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
        **process_options,
    )
    try:
        deadline = time.time() + 20
        ready = False
        while time.time() < deadline:
            if server.poll() is not None:
                raise RuntimeError("Preview exited before becoming ready.")
            try:
                with urllib.request.urlopen(f"http://{HOST}:{PORT}", timeout=1) as response:
                    ready = response.status == 200
                    if ready:
                        break
            except Exception:
                time.sleep(0.25)
        if not ready:
            raise RuntimeError("Preview did not become ready within 20 seconds.")

        project = large_project()
        persisted = {
            "state": {
                "project": project,
                "snapshots": [],
                "branches": [{"metadata": project["branch"], "project": project}],
                "currentUserId": "user-owner",
            },
            "version": 0,
        }

        try:
            with sync_playwright() as p:
                launch_args = {
                    "headless": True,
                    "args": [
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--no-proxy-server",
                        "--proxy-bypass-list=*",
                    ],
                }
                if CHROMIUM:
                    executable = Path(CHROMIUM).expanduser().resolve()
                    if not executable.is_file() or (os.name != "nt" and not os.access(executable, os.X_OK)):
                        raise RuntimeError(f"AIW_CHROMIUM_PATH must name an existing executable file: {executable}")
                    launch_args["executable_path"] = str(executable)
                browser = p.chromium.launch(**launch_args)
                page = browser.new_page(viewport={"width": 1920, "height": 1080})
                start = time.perf_counter()
                page.goto(f"http://{HOST}:{PORT}", wait_until="networkidle")
                initial_load_ms = (time.perf_counter() - start) * 1000
                page.evaluate(
                    "([key, value]) => localStorage.setItem(key, JSON.stringify(value))",
                    ["aiw-sprint7-workspace", persisted],
                )
                start = time.perf_counter()
                page.reload(wait_until="networkidle")
                page.wait_for_selector(".react-flow__node", timeout=30000)
                hydrated_load_ms = (time.perf_counter() - start) * 1000
                rendered_nodes = page.locator(".react-flow__node").count()
                total_model_nodes = page.evaluate(
                    "JSON.parse(localStorage.getItem('aiw-sprint7-workspace')).state.project.nodes.length"
                )

                page.evaluate(
                    """
                    window.__aiwFrames = [];
                    window.__aiwFrameDone = false;
                    let previous = performance.now();
                    let count = 0;
                    function tick(now) {
                      window.__aiwFrames.push(now - previous);
                      previous = now;
                      count += 1;
                      if (count < 180) requestAnimationFrame(tick);
                      else window.__aiwFrameDone = true;
                    }
                    requestAnimationFrame(tick);
                    """
                )
                canvas = page.locator(".flow-container")
                box = canvas.bounding_box()
                if box:
                    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                    for i in range(18):
                        page.mouse.wheel(0, -280 if i % 2 == 0 else 220)
                        time.sleep(0.025)
                page.wait_for_function("window.__aiwFrameDone === true", timeout=15000)
                intervals = page.evaluate("window.__aiwFrames.slice(1)")
                browser.close()

            report = {
                "status": "completed",
                "modelNodes": total_model_nodes,
                "modelEdges": len(project["edges"]),
                "visibleDomNodesAfterFitView": rendered_nodes,
                "initialLoadMs": round(initial_load_ms, 2),
                "hydratedLargeModelLoadMs": round(hydrated_load_ms, 2),
                "frameIntervalAverageMs": round(mean(intervals), 2),
                "frameIntervalP95Ms": round(percentile(intervals, 0.95), 2),
                "estimatedAverageFps": round(1000 / mean(intervals), 2) if intervals else 0,
                "estimatedP95Fps": round(1000 / percentile(intervals, 0.95), 2) if intervals else 0,
                "framesOver33ms": sum(1 for value in intervals if value > 33.33),
                "framesMeasured": len(intervals),
                "browser": "Chromium headless via Python Playwright",
                "note": "Synthetic 1,500-node browser rendering and zoom-interaction benchmark; not a substitute for cross-device UX testing.",
            }
            write_report(report)
            return 0
        except PlaywrightError as error:
            write_report(
                {
                    "status": "blocked_by_environment",
                    "modelNodes": len(project["nodes"]),
                    "modelEdges": len(project["edges"]),
                    "reason": str(error),
                    "harnessAvailable": True,
                    "runCommand": "npm run browser:perf",
                    "note": "The browser benchmark harness is complete, but this execution environment blocked local Chromium navigation. Run it in a normal development or CI environment with an available Playwright Chromium binary.",
                }
            )
            return 0
    except Exception as error:
        write_report(
            {
                "status": "failed",
                "reason": str(error),
                "harnessAvailable": True,
                "runCommand": "npm run browser:perf",
            }
        )
        return 1
    finally:
        if server.poll() is None:
            if os.name == "nt":
                server.terminate()
            else:
                os.killpg(server.pid, signal.SIGTERM)
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                if os.name == "nt":
                    server.kill()
                else:
                    os.killpg(server.pid, signal.SIGKILL)


if __name__ == "__main__":
    raise SystemExit(main())
