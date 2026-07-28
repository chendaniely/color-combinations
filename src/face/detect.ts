// The ONLY file that imports MediaPipe. Everything downstream depends on the
// plain FaceGeometry shape, not on the detector — so swapping BlazeFace for
// the 478-point Face Landmarker is a change to this file alone.
//
// The model and wasm are served from our own origin (see the copy step in
// scripts/copy-mediapipe.mjs). tests/facePrivacy.test.ts forbids an absolute
// URL here, so this can never be silently repointed at a CDN.
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import type { FaceGeometry, Point } from '../core/types'

export class FaceModelError extends Error {
  constructor(cause?: unknown) {
    super('The face model could not be loaded.')
    this.name = 'FaceModelError'
    this.cause = cause
  }
}

const BASE = `${import.meta.env.BASE_URL}mediapipe`.replace(/([^:])\/{2,}/g, '$1/')

let detector: FaceDetector | null = null
let loading: Promise<FaceDetector> | null = null

// Lazily loaded so the ~3.5 MB runtime is paid for only by visitors who open
// the You tab (CLAUDE.md: weight is paid by the feature that incurs it).
async function getDetector(): Promise<FaceDetector> {
  if (detector) return detector
  if (!loading) {
    loading = (async () => {
      try {
        const files = await FilesetResolver.forVisionTasks(BASE)
        detector = await FaceDetector.createFromOptions(files, {
          baseOptions: { modelAssetPath: `${BASE}/blaze_face_short_range.tflite` },
          runningMode: 'IMAGE',
        })
        return detector
      } catch (err) {
        loading = null
        throw new FaceModelError(err)
      }
    })()
  }
  return loading
}

// BlazeFace keypoint order is fixed: right eye, left eye, nose, mouth, right
// ear, left ear — "right"/"left" being the subject's, so they appear mirrored.
// Coordinates come back normalised 0..1; callers want source pixels.
function toPoint(kp: { x: number; y: number }, w: number, h: number): Point {
  return { x: kp.x * w, y: kp.y * h }
}

export async function detectFace(source: HTMLCanvasElement): Promise<FaceGeometry | null> {
  const d = await getDetector()
  const { detections } = d.detect(source)
  const withBoxes = detections.filter((det) => det.boundingBox && det.keypoints.length >= 6)
  if (!withBoxes.length) return null

  // Largest face wins — the subject is the one nearest the camera.
  const best = [...withBoxes].sort(
    (a, b) => (b.boundingBox!.width * b.boundingBox!.height)
            - (a.boundingBox!.width * a.boundingBox!.height))[0]

  const bb = best.boundingBox!
  const kp = best.keypoints
  const { width: w, height: h } = source

  return {
    box: { x: bb.originX, y: bb.originY, width: bb.width, height: bb.height },
    rightEye: toPoint(kp[0], w, h),
    leftEye: toPoint(kp[1], w, h),
    nose: toPoint(kp[2], w, h),
    mouth: toPoint(kp[3], w, h),
    rightEar: toPoint(kp[4], w, h),
    leftEar: toPoint(kp[5], w, h),
  }
}
