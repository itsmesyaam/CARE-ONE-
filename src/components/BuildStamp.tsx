import React from 'react';

export function BuildStamp(): React.JSX.Element {
  const commit = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : 'local';
  const buildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '';

  return (
    <footer
      data-testid="build-stamp"
      className="py-3 text-center text-[10px] text-slate-400 select-none border-t border-slate-100 bg-white"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
        <span className="font-semibold text-slate-500">CareOne v0.1.0</span>
        <span>&bull;</span>
        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
          git:{commit}
        </span>
        {buildTime ? (
          <>
            <span>&bull;</span>
            <span className="text-slate-500">
              built {buildTime.slice(0, 16).replace('T', ' ')} UTC
            </span>
          </>
        ) : null}
      </div>
    </footer>
  );
}
