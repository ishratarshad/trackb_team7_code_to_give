from datetime import datetime, timezone


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"


def test_pantries_crud_and_feedback_flow(client):
    pantry_payload = {
        "name": "Grace Pantry",
        "neighborhood": "Camden",
        "address": "123 Main St",
        "latitude": 39.93,
        "longitude": -75.11,
    }
    pantry_resp = client.post("/pantries", json=pantry_payload)
    assert pantry_resp.status_code == 200
    pantry = pantry_resp.json()

    feedback_payload = {
        "pantry_id": pantry["id"],
        "rating": 4,
        "wait_time_min": 20,
        "resource_type": "produce",
        "comment": "Long wait in line",
        "issue_categories": ["long_wait_times"],
        "created_at": datetime(2026, 3, 13, 15, 20, tzinfo=timezone.utc).isoformat(),
    }
    created = client.post("/feedback", json=feedback_payload)
    assert created.status_code == 200
    created_body = created.json()
    assert created_body["pantry_id"] == pantry["id"]
    assert created_body["pantry_name"] == pantry_payload["name"]

    listed = client.get("/feedback")
    assert listed.status_code == 200
    items = listed.json()
    assert len(items) >= 1


def test_analytics_summary_and_issues(client):
    pantries = client.get("/pantries").json()
    pantry_id = pantries[0]["id"]

    client.post(
        "/feedback",
        json={
            "pantry_id": pantry_id,
            "rating": 5,
            "wait_time_min": 10,
            "resource_type": "produce",
            "issue_categories": ["inventory_shortages"],
        },
    )
    resp = client.get("/analytics/summary")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_feedback"] >= 1

    issues = client.get("/analytics/issues")
    assert issues.status_code == 200


def test_trends_heatmap_supply(client):
    pantries = client.get("/pantries").json()
    pantry_id = pantries[0]["id"]

    trends = client.get("/analytics/trends")
    assert trends.status_code == 200

    heatmap = client.get("/analytics/heatmap")
    assert heatmap.status_code == 200

    supply = client.get(f"/pantries/{pantry_id}/supply")
    assert supply.status_code == 200


def test_datasets_and_reports(client):
    datasets = client.get("/datasets")
    assert datasets.status_code == 200
    dataset_id = datasets.json()[0]["id"]

    detail = client.get(f"/datasets/{dataset_id}")
    assert detail.status_code == 200

    report = client.post("/reports", json={"title": "Monthly Report"})
    assert report.status_code == 200
    report_id = report.json()["id"]

    report_get = client.get(f"/reports/{report_id}")
    assert report_get.status_code == 200
