import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export function AdaptiveCameraScaler() {
  const { camera, size } = useThree()

  useEffect(() => {
    if (!camera || !camera.isPerspectiveCamera) return

    const aspect = size.width / Math.max(1, size.height)

    // Base target is 16:9 (aspect ≈ 1.78) with base FOV = 50
    // If aspect is smaller (e.g. iPad 4:3 = 1.33 or 3:2 = 1.5), scale FOV so horizontal track & character scale match
    if (aspect < 1.7) {
      const targetFov = 50 * (1.7 / aspect) * 0.88
      camera.fov = Math.min(75, Math.max(45, targetFov))
    } else {
      camera.fov = 50
    }

    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height])

  return null
}
