import { Button } from "@/components/buttons/Button";
import {
  OverlayDisplay,
  OverlayPortal,
} from "@/components/overlays/OverlayDisplay";

interface ConfirmOverlayProps {
  isOpen: boolean;
  message: string;
  onConfirm: (event: React.MouseEvent) => void;
  onCancel: () => void;
  confirmButtonTheme?: "white" | "purple" | "secondary" | "danger" | "glass";
  cancelButtonTheme?: "white" | "purple" | "secondary" | "danger" | "glass";
  backdropOpacity?: number;
  backdropColor?: string;
}

export function ConfirmOverlay({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmButtonTheme = "purple",
  cancelButtonTheme = "secondary",
  backdropOpacity = 0.5,
  backdropColor = "black",
}: ConfirmOverlayProps) {
  return (
    <OverlayPortal show={isOpen}>
      <div
        className={`fixed inset-0 bg-${backdropColor} bg-opacity-${backdropOpacity * 100} flex items-center justify-center z-50`}
      >
        <OverlayDisplay>
          <div className="bg-background-main text-white p-4 rounded-lg shadow-md flex flex-col items-center pointer-events-auto gap-3">
            <p className="mb-4, text-center">{message}</p>
            <div className="flex space-x-2">
              <Button
                theme={confirmButtonTheme}
                onClick={onConfirm}
                padding="px-3 py-1"
              >
                Confirm
              </Button>
              <Button
                theme={cancelButtonTheme}
                onClick={onCancel}
                padding="px-3 py-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </OverlayDisplay>
      </div>
    </OverlayPortal>
  );
}
