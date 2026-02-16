"""
PlacementEngine
Computes optimal placement for products based on vision analysis.
Each category has a PlacementPolicy defining snapping, alignment, shadows.
"""

import math
from typing import Optional
from app.models import AnchorPoint, PlacementResult


class PlacementPolicy:
    """Base placement policy. Override for category-specific behavior."""

    snap_to: str = ""  # anchor label to snap to
    align_plane: str = "wall"
    shadow_plane: str = "floor"
    default_z_order: int = 5
    scale_factor: float = 1.0

    def compute(
        self,
        anchors: list[AnchorPoint],
        asset_width: int,
        asset_height: int,
        image_width: int,
        image_height: int,
        target_anchor_label: Optional[str] = None,
    ) -> PlacementResult:
        target_label = target_anchor_label or self.snap_to
        anchor = self._find_anchor(anchors, target_label)

        if anchor:
            x = anchor.x
            y = anchor.y
            # Scale asset to fit anchor bounds
            scale_x = anchor.width / asset_width if asset_width > 0 else 1.0
            scale_y = anchor.height / asset_height if asset_height > 0 else 1.0
            scale = min(scale_x, scale_y) * self.scale_factor
        else:
            # Fallback: center in image
            x = image_width / 2
            y = image_height / 2
            scale = min(image_width / asset_width, image_height / asset_height) * 0.3

        return PlacementResult(
            x=x,
            y=y,
            scale=round(scale, 4),
            rotation=0.0,
            z_order=self.default_z_order,
            shadow_plane=self.shadow_plane,
            occlusion_mask=None,
        )

    def _find_anchor(
        self, anchors: list[AnchorPoint], label: str
    ) -> Optional[AnchorPoint]:
        matching = [a for a in anchors if a.label == label]
        if matching:
            return max(matching, key=lambda a: a.confidence)
        return None


class FaucetPolicy(PlacementPolicy):
    """Snap to sink anchor, align to countertop plane, add contact shadow."""

    snap_to = "sink"
    align_plane = "countertop"
    shadow_plane = "countertop"
    default_z_order = 6
    scale_factor = 0.6

    def compute(self, anchors, asset_width, asset_height, image_width, image_height, target_anchor_label=None):
        result = super().compute(anchors, asset_width, asset_height, image_width, image_height, target_anchor_label)
        # Offset faucet above sink center
        sink = self._find_anchor(anchors, "sink")
        if sink:
            result.y = sink.y - sink.height * 0.6
        return result


class ShowerHeadPolicy(PlacementPolicy):
    """Snap to wall anchor, align to wall plane, add subtle wall shadow."""

    snap_to = "shower_head"
    align_plane = "wall"
    shadow_plane = "wall"
    default_z_order = 5
    scale_factor = 0.5


class MirrorPolicy(PlacementPolicy):
    """Snap to mirror bounds, scale proportionally."""

    snap_to = "mirror"
    align_plane = "wall"
    shadow_plane = "wall"
    default_z_order = 3
    scale_factor = 1.0


class LightingPolicy(PlacementPolicy):
    """Snap to ceiling or vanity anchor, apply soft glow and downward shadow."""

    snap_to = "lighting_fixture"
    align_plane = "ceiling"
    shadow_plane = "ceiling"
    default_z_order = 8
    scale_factor = 0.8


class FlooringPolicy(PlacementPolicy):
    """Apply perspective-corrected texture overlay using floor segmentation mask."""

    snap_to = ""
    align_plane = "floor"
    shadow_plane = "floor"
    default_z_order = 0
    scale_factor = 1.0

    def compute(self, anchors, asset_width, asset_height, image_width, image_height, target_anchor_label=None):
        # Flooring covers the entire floor plane
        return PlacementResult(
            x=image_width / 2,
            y=image_height * 0.8,
            scale=1.0,
            rotation=0.0,
            z_order=0,
            shadow_plane="floor",
            occlusion_mask=None,
        )


class CabinetPolicy(PlacementPolicy):
    """Change material/finish using segmentation mask overlay."""

    snap_to = "cabinet_run"
    align_plane = "wall"
    shadow_plane = "wall"
    default_z_order = 1
    scale_factor = 1.0


class CountertopPolicy(PlacementPolicy):
    """Apply surface texture mapped with shading to countertop mask."""

    snap_to = "sink"
    align_plane = "countertop"
    shadow_plane = "countertop"
    default_z_order = 2
    scale_factor = 1.0

    def compute(self, anchors, asset_width, asset_height, image_width, image_height, target_anchor_label=None):
        return PlacementResult(
            x=image_width / 2,
            y=image_height * 0.5,
            scale=1.0,
            rotation=0.0,
            z_order=2,
            shadow_plane="countertop",
            occlusion_mask=None,
        )


class SinkPolicy(PlacementPolicy):
    snap_to = "sink"
    align_plane = "countertop"
    shadow_plane = "countertop"
    default_z_order = 4
    scale_factor = 0.9


class AppliancePolicy(PlacementPolicy):
    snap_to = "stove"
    align_plane = "floor"
    shadow_plane = "floor"
    default_z_order = 3
    scale_factor = 0.9


class BacksplashPolicy(PlacementPolicy):
    snap_to = ""
    align_plane = "wall"
    shadow_plane = "wall"
    default_z_order = 1
    scale_factor = 1.0

    def compute(self, anchors, asset_width, asset_height, image_width, image_height, target_anchor_label=None):
        return PlacementResult(
            x=image_width / 2,
            y=image_height * 0.38,
            scale=1.0,
            rotation=0.0,
            z_order=1,
            shadow_plane="wall",
            occlusion_mask=None,
        )


class VanityPolicy(PlacementPolicy):
    snap_to = "vanity"
    align_plane = "floor"
    shadow_plane = "floor"
    default_z_order = 3
    scale_factor = 0.9


class ToiletPolicy(PlacementPolicy):
    snap_to = "toilet"
    align_plane = "floor"
    shadow_plane = "floor"
    default_z_order = 3
    scale_factor = 0.8


class TubPolicy(PlacementPolicy):
    snap_to = "bathtub"
    align_plane = "floor"
    shadow_plane = "floor"
    default_z_order = 3
    scale_factor = 0.9


class HardwarePolicy(PlacementPolicy):
    snap_to = "cabinet_run"
    align_plane = "wall"
    shadow_plane = "wall"
    default_z_order = 7
    scale_factor = 0.15


# ─── Placement Engine ───

CATEGORY_POLICIES: dict[str, PlacementPolicy] = {
    "faucets": FaucetPolicy(),
    "sinks": SinkPolicy(),
    "countertops": CountertopPolicy(),
    "cabinets": CabinetPolicy(),
    "backsplash": BacksplashPolicy(),
    "flooring": FlooringPolicy(),
    "lighting": LightingPolicy(),
    "mirrors": MirrorPolicy(),
    "hardware": HardwarePolicy(),
    "appliances": AppliancePolicy(),
    "fixtures": PlacementPolicy(),
    "shower": ShowerHeadPolicy(),
    "tub": TubPolicy(),
    "vanity": VanityPolicy(),
    "toilet": ToiletPolicy(),
}


class PlacementEngine:
    """
    Main placement engine.
    Routes to category-specific policies for optimal placement.
    """

    def compute(
        self,
        category: str,
        asset_width: int,
        asset_height: int,
        anchors: list[AnchorPoint],
        depth_map_url: str,
        image_width: int,
        image_height: int,
        target_anchor_label: Optional[str] = None,
    ) -> PlacementResult:
        policy = CATEGORY_POLICIES.get(category, PlacementPolicy())
        return policy.compute(
            anchors=anchors,
            asset_width=asset_width,
            asset_height=asset_height,
            image_width=image_width,
            image_height=image_height,
            target_anchor_label=target_anchor_label,
        )
