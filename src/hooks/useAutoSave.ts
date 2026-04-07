import { useEffect } from "react";
import { useConfigStore } from "../stores/configStore";
import { useProjectStore, setStatus, markSaved } from "../stores/projectStore";
import { t } from "../i18n";
import { saveProjectToPath } from "../lib/fileIO";

/**
 * 자동 저장 훅.
 * configStore의 autoSaveInterval에 따라 주기적으로 프로젝트 저장.
 * projectStore의 projectPath가 있는 경우(이미 한 번 저장한 프로젝트)에만 동작.
 */
export function useAutoSave() {
  const autoSaveInterval = useConfigStore((s) => s.config.autoSaveInterval);
  const projectPath = useProjectStore((s) => s.projectPath);

  useEffect(() => {
    if (autoSaveInterval === 0 || !projectPath) return;

    const timer = setInterval(async () => {
      // 실행 시점의 최신 경로 확인
      const path = useProjectStore.getState().projectPath;
      if (!path) return;

      try {
        useProjectStore.getState().saveCurrentDocState();
        const proj = useProjectStore.getState().project;
        await saveProjectToPath(path, proj);
        markSaved();
        setStatus(`${t("status.autoSaved")}: ${new Date().toLocaleTimeString()}`);
      } catch {
        // 저장 실패 시 조용히 무시
      }
    }, autoSaveInterval * 1000);

    return () => clearInterval(timer);
  }, [autoSaveInterval, projectPath]);
}
