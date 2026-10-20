# RegimeVGGT project page

Live page: https://tracyou07.github.io/regimevggt/

This is a static HTML/CSS/JavaScript site. GitHub Pages serves this directory from the repository's `main` branch; no build or package installation is required. The personal homepage in the repository root is separate.

To preview locally from the repository root:

```sh
python -m http.server 4317 --bind 127.0.0.1
```

Then open http://127.0.0.1:4317/regimevggt/.

## Research assets

- [Paper](https://arxiv.org/abs/2606.18439) · [Implementation](https://github.com/Tracyou07/RegimeVGGT).
- The two interactive point clouds were reconstructed with the final RegimeVGGT implementation, commit `afaa6a43898b3ec6c9ebbf5f606d3a4348527728`.
- Lounge: 200 views across ScanNet scene0013_02. Forest road: 64 sampled video frames. Lounge is the default scene.
- Display processing uses per-frame confidence filtering (50th percentile for Lounge, 5th for Forest road), deterministic sampling, 0.5–99.5 percentile bounds and voxel downsampling to at most 300,000 points.
- Camera overlays use predicted poses and the same display transform as their point clouds. Frustum size is illustrative; the full path and at most 40 frustums are shown. These qualitative demos are separate from the paper benchmark.
- Outdoor input video is the [VGGT-Ω forest-road example](https://github.com/facebookresearch/vggt-omega/tree/main/examples). Its reconstruction on this page was produced by RegimeVGGT.
- `assets/pointcloud/scenes.json` indexes the scene metadata, binary geometry, input strips, previews and camera poses.
- Vendored Three.js 0.186.1 and addons retain their MIT license and source record in `vendor/three/`.
- University marks are from official [Penn](https://branding.web-resources.upenn.edu/logos-and-branding/download-penn-logos), [UC Irvine](https://brand.uci.edu/logos/index.php) and [NTU](https://www.ntu.edu.sg/) sources.

The design follows the author-selected [OpenWAM](https://openwam.stanford.edu/) reference and the official [frontend-design guidance](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md).
