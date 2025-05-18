import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SilenceAlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void
  onStop: () => void
  countdownSeconds: number | null
  thresholdMinutes: number
  type: 'initial' | 'stopped' | 'continued'
}

export default function SilenceAlertDialog({
  open,
  onOpenChange,
  onContinue,
  onStop,
  countdownSeconds,
  thresholdMinutes,
  type
}: SilenceAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === 'initial' && "Silence Detected"}
            {type === 'stopped' && "Recording Stopped"}
            {type === 'continued' && "Recording Continues"}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {type === 'initial' && (
            <>
              <p>No audio has been detected for {thresholdMinutes} minutes.</p>
              {countdownSeconds !== null && (
                <p className="mt-2">Recording will stop in <span className="font-bold text-primary">{countdownSeconds}</span> seconds unless you continue.</p>
              )}
            </>
          )}
          {type === 'stopped' && (
            <p>Recording has been stopped due to prolonged silence.</p>
          )}
          {type === 'continued' && (
            <p>Recording will continue. Silence detection has been reset.</p>
          )}
        </div>
        <DialogFooter>
          {type === 'initial' ? (
            <>
              <Button variant="outline" onClick={onContinue}>
                Continue Recording
              </Button>
              <Button variant="destructive" onClick={onStop}>
                Stop Now
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 