import importlib.util
import os
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).parents[1] / "src" / "workers" / "cad-python" / "cad_intelligence.py"
SPEC = importlib.util.spec_from_file_location("cad_intelligence", MODULE_PATH)
cad = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cad)


class CadIntelligenceTests(unittest.TestCase):
    def test_plot_label_guard_rejects_headings_and_cad_formatting(self):
        for value in ("PLOT", "PLOTS", "PLOTTING", "PLOT NO.", r"\pxqc,t20;GREEN STRIPE - 15"):
            self.assertIsNone(cad.normalize_plot_label(value, 500))
        self.assertEqual(cad.normalize_plot_label("Plot A-101", 500), "A-101")
        self.assertEqual(cad.normalize_plot_label("474", 474), "474")
        self.assertIsNone(cad.normalize_plot_label("999", 474))
        self.assertIsNone(cad.normalize_plot_label("2120", 474))
        self.assertIsNone(cad.normalize_plot_label("3K", 474))
        self.assertIsNone(cad.normalize_plot_label("-12", 474))
        self.assertIsNone(cad.normalize_plot_label("A8", 474))

    def test_expected_plot_counts_are_read_from_schedule_text(self):
        counts = cad.expected_counts_from_text(
            "TOTAL NO. OF PLOTS 474 RESIDENTIAL 443 COMMERCIAL 29 EWS 2"
        )
        self.assertEqual(counts, {
            "total": 474,
            "residential": 443,
            "commercial": 29,
            "ews": 2,
        })
        self.assertEqual(cad.validated_expected_counts(counts), counts)
        self.assertEqual(cad.validated_expected_counts({
            "total": 474,
            "residential": 97971,
            "commercial": 28258,
            "ews": 96467,
        }), {"total": 474})

    def test_rotation_mapping_returns_ocr_points_to_original_image_space(self):
        self.assertEqual(cad.inverse_rotated_point([49, 0], 90, 100, 50), [0.0, 0.0])
        self.assertEqual(cad.inverse_rotated_point([49, 99], 90, 100, 50), [99.0, 0.0])
        self.assertEqual(cad.inverse_rotated_point([0, 0], 180, 100, 50), [99.0, 49.0])

    def test_dxf_topology_emits_review_candidates_not_confirmed_records(self):
        try:
            import ezdxf
        except ImportError:
            self.skipTest("ezdxf is not installed")
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "plots.dxf"
            document = ezdxf.new()
            document.header["$INSUNITS"] = 2
            modelspace = document.modelspace()
            modelspace.add_lwpolyline([(0, 0), (30, 0), (30, 40), (0, 40)], close=True, dxfattribs={"layer": "PLOTS"})
            modelspace.add_text("A-101", dxfattribs={"layer": "PLOTS"}).set_placement((15, 20))
            modelspace.add_lwpolyline([(40, 0), (70, 0), (70, 40), (40, 40)], close=True, dxfattribs={"layer": "PLOTS"})
            modelspace.add_text("A-102", dxfattribs={"layer": "PLOTS"}).set_placement((55, 20))
            document.saveas(path)
            result = cad.extract_dxf(path, {
                "analysis": {
                    "expectedCounts": {"total": 2},
                    "scaleCalibration": {"drawingUnitsPerFoot": 1},
                }
            })
            plots = [entity for entity in result["entities"] if entity["type"] == "PLOT"]
            self.assertEqual({entity["label"] for entity in plots}, {"A-101", "A-102"})
            self.assertTrue(all(entity["status"] == "SUGGESTED" for entity in plots))
            self.assertTrue(all(entity["measurements"]["areaSqft"] == 1200 for entity in plots))

    def test_private_mixed_pdf_fixture_when_configured(self):
        fixture = os.environ.get("CAD_PRIVATE_FIXTURE_PDF")
        if not fixture:
            self.skipTest("CAD_PRIVATE_FIXTURE_PDF is not configured")
        with tempfile.TemporaryDirectory() as directory:
            result = cad.inspect_pdf(Path(fixture), directory)
            analysis = result["analysis"]
            self.assertEqual(analysis["sourceKind"], "MIXED_RASTER_VECTOR")
            self.assertTrue(analysis["inspection"]["requiresRasterRecognition"])
            self.assertTrue(analysis["inspection"]["requiresVectorExtraction"])
            self.assertEqual(analysis["expectedCounts"].get("total"), 474)
            recognition = analysis["inspection"]["recognitionImage"]
            self.assertEqual(recognition["source"], "embedded-image")
            self.assertEqual((recognition["width"], recognition["height"]), (10882, 7709))
            layers = analysis["inspection"]["optionalLayers"]
            self.assertTrue(any("MPB" in layer for layer in layers))
            self.assertTrue(any("RMU" in layer for layer in layers))
            self.assertTrue(any("KVA" in layer for layer in layers))
            self.assertIn("previewArtifact", analysis)


if __name__ == "__main__":
    unittest.main()
