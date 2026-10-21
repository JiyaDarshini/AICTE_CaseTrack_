.PHONY: install seed test run-backend run-frontend dev

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

seed:
	cd backend && python -m scripts.seed

test:
	cd backend && python -m pytest tests -v
	cd frontend && npm run test

run-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

run-frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting full AICTE CaseTrack platform..."
	@./run.sh
