import React, { useRef } from 'react';
import { POSE_DEFINITIONS, PoseId } from './types';
import { Upload, RotateCcw, CheckCircle2, Image as ImageIcon, Sparkles } from 'lucide-react';

interface CharacterPoseManagerProps {
  poses: Record<PoseId, string>;
  customUploadCount: number;
  onUpdatePose: (poseId: PoseId, dataUri: string) => void;
  onBatchUpload: (files: FileList) => void;
  onResetToDefaults: () => void;
  language: 'tr' | 'en';
}

export const CharacterPoseManager: React.FC<CharacterPoseManagerProps> = ({
  poses,
  customUploadCount,
  onUpdatePose,
  onBatchUpload,
  onResetToDefaults,
  language,
}) => {
  const batchInputRef = useRef<HTMLInputElement>(null);
  const singleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleSingleFileChange = (poseId: PoseId, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onUpdatePose(poseId, result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isTr = language === 'tr';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              12
            </span>
            <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
              {isTr ? '12 Karakter Duruşu (Şeffaf PNG)' : '12 Character Poses (Transparent PNG)'}
            </h3>

            {customUploadCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{isTr ? 'Kalıcı Kaydedildi' : 'Permanently Saved'}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isTr
              ? 'Yüklediğiniz tüm karakter PNG’leri tarayıcınızda kalıcı saklanır (sayfa yenilense de silinmez).'
              : 'All custom uploaded character PNGs are permanently saved in your browser (preserved across reloads).'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <input
            type="file"
            ref={batchInputRef}
            multiple
            accept="image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onBatchUpload(e.target.files);
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => batchInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            {isTr ? 'Toplu PNG Yükle' : 'Batch Upload PNGs'}
          </button>

          <button
            type="button"
            onClick={onResetToDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            title={isTr ? 'Varsayılan Karakter Setine Dön' : 'Reset to default character set'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isTr ? 'Varsayılan' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Grid of 12 poses */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
        {POSE_DEFINITIONS.map((def) => {
          const imageUri = poses[def.id];
          const hasImage = Boolean(imageUri);

          return (
            <div
              key={def.id}
              className="group relative flex flex-col items-center bg-white border border-slate-200 rounded-xl p-2 hover:border-blue-400 hover:shadow-xs transition-all"
            >
              {/* Index badge */}
              <div className="absolute top-1.5 left-1.5 bg-slate-900/70 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                #{def.index}
              </div>

              {/* Character thumbnail preview with transparent checkered background */}
              <div
                className="w-full aspect-square rounded-lg flex items-center justify-center overflow-hidden mb-1.5 relative border border-slate-100"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                  backgroundSize: '12px 12px',
                  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                }}
              >
                {hasImage ? (
                  <img
                    src={imageUri}
                    alt={def.label}
                    className="w-full h-full object-contain p-1 transition-transform group-hover:scale-105"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                )}

                {/* Hover upload trigger */}
                <button
                  type="button"
                  onClick={() => singleInputRefs.current[def.id]?.click()}
                  className="absolute inset-0 bg-slate-900/60 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity backdrop-blur-2xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isTr ? 'Değiştir' : 'Replace'}</span>
                </button>
              </div>

              {/* Title & info */}
              <p className="text-[11px] font-semibold text-slate-800 text-center truncate w-full">
                {isTr ? def.trLabel : def.label}
              </p>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">
                {def.id}
              </span>

              {/* Hidden file input for individual replacement */}
              <input
                type="file"
                ref={(el) => {
                  singleInputRefs.current[def.id] = el;
                }}
                accept="image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => handleSingleFileChange(def.id, e)}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/80">
        <span className="flex items-center gap-1 text-emerald-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isTr ? '12/12 Duruş Aktif' : '12/12 Poses Ready'}
        </span>
        <span className="text-slate-400">
          {customUploadCount > 0
            ? isTr
              ? `${customUploadCount} özel PNG yüklendi`
              : `${customUploadCount} custom PNGs loaded`
            : isTr
              ? 'Varsayılan karakter devrede'
              : 'Default character pack active'}
        </span>
      </div>
    </div>
  );
};
