from apscheduler.schedulers.background import BackgroundScheduler

from app.jobs.tasks import refresh_watchlist_quotes


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="Asia/Taipei")
    scheduler.add_job(refresh_watchlist_quotes, "interval", minutes=15, id="refresh_watchlist_quotes", replace_existing=True)
    return scheduler
