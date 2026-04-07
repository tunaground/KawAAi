import { useEffect } from "react";
import { useConfigStore } from "../stores/configStore";
import { useProjectStore } from "../stores/projectStore";
import { useStatusStore, setStatus, markSaved } from "../stores/statusStore";
import { saveProjectToPath } from "../lib/fileIO";

/**
 * 자동 저장 훅.
 * configStore의 autoSaveInterval에 따라 주기적으로 프로젝트 저장.
 * statusStore의 projectPath가 있는 경우(이미 한 번 저장한 프로젝트)에만 동작.
 */
export function useAutoSave() {
  const autoSaveInterval = useConfigStore((s) => s.config.autoSaveInterval);
  const projectPath = useStatusStore((s) => s.projectPath);

  useEffect(() => {
    if (autoSaveInterval === 0 || !projectPath) return;

    const timer = setInterval(async () => {
      // 실행 시점의 최신 경로 확인
      const path = useStatusStore.getState().projectPath;
      if (!path) return;

      try {
        useProjectStore.getState().saveCurrentDocState();
        const proj = useProjectStore.getState().project;
        await saveProjectToPath(path, proj);
        markSaved();
        setStatus(`자동 저장됨: ${new Date().toLocaleTimeString()}`);
      } catch {
        // 저장 실패 시 조용히 무시
      }
    }, autoSaveInterval * 1000);

    return () => clearInterval(timer);
  }, [autoSaveInterval, projectPath]);
}
