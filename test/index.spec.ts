import { DefaultTimeout, runTargetSpec, TestLogger, TestProjectHost } from "@angular-devkit/architect/testing";
import { join, normalize, virtualFs } from "@angular-devkit/core";
import { tap } from "rxjs/operators";

import { StylelintBuilderOptions } from "../src/index";

describe("Stylelint Target", () => {
	const filesWithErrors = { "src/foo.scss": "a { color: #ffffff }" };
	const stylelintTargetSpec = { project: "app", target: "lint" };
	const workspaceRoot = join(normalize(__dirname), "hello-world-app");
	const host = new TestProjectHost(workspaceRoot);

	beforeEach(async () => {
		await host.initialize().toPromise();
	});

	afterEach(async () => {
		await host.restore().toPromise();
	});

	it("should be successful when there is no lint error", async () => {
		await runTargetSpec(host, stylelintTargetSpec)
			.pipe(
				tap(buildEvent => expect(buildEvent.success).toBe(true))
			)
			.toPromise();
	});

	it("should not be successful when there is a lint error", async () => {
		host.writeMultipleFiles(filesWithErrors);
		await runTargetSpec(host, stylelintTargetSpec)
			.pipe(
				tap(buildEvent => expect(buildEvent.success).toBe(false))
			)
			.toPromise();
	});

	it("should support exclude files", async () => {
		host.writeMultipleFiles(filesWithErrors);
		const overrides: Partial<StylelintBuilderOptions> = { exclude: ["**/foo.scss"] };

		await runTargetSpec(host, stylelintTargetSpec, overrides)
			.pipe(
				tap(buildEvent => expect(buildEvent.success).toBe(true))
			)
			.toPromise();
	});

	it("should support fix of lint issues", async () => {
		host.writeMultipleFiles(filesWithErrors);
		const overrides: Partial<StylelintBuilderOptions> = { fix: true };

		await runTargetSpec(host, stylelintTargetSpec, overrides)
			.pipe(
				tap(buildEvent => expect(buildEvent.success).toBe(true)),
				tap(() => {
					const fileName = normalize("src/foo.scss");
					const content = virtualFs.fileBufferToString(host.scopedSync().read(fileName));
					expect(content).toContain(`a { color: #fff }`);
				})
			)
			.toPromise();
	});

	it("should support force success", async () => {
		host.writeMultipleFiles(filesWithErrors);
		const logger = new TestLogger("lint-force");
		const overrides: Partial<StylelintBuilderOptions> = { force: true };

		await runTargetSpec(host, stylelintTargetSpec, overrides, DefaultTimeout, logger)
			.pipe(
				tap(buildEvent => expect(buildEvent.success).toBe(true)),
				tap(() => {
					expect(logger.includes("Lint errors found in the listed files")).toBe(true);
				})
			)
			.toPromise();
	});

});
