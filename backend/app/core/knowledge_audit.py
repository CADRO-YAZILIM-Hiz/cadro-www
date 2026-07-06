from app.models.knowledge_base import KnowledgeArticle, KnowledgeArticleVersion, KnowledgeArticleReceiptLog


def snapshot_knowledge_article(
    db,
    article: KnowledgeArticle,
    *,
    actor_employee_id: int | None,
    snapshot_type: str,
):
    db.add(
        KnowledgeArticleVersion(
            article_id=article.id,
            company_id=article.company_id,
            actor_employee_id=actor_employee_id,
            snapshot_type=snapshot_type,
            title=article.title,
            summary=article.summary,
            content=article.content,
            category=article.category,
            article_type=article.article_type,
            version=article.version,
            status=article.status,
            require_ack=article.require_ack,
            target_scope=article.target_scope,
            target_role=article.target_role,
            target_department_id=article.target_department_id,
            target_employee_id=article.target_employee_id,
            published_at=article.published_at,
        )
    )


def log_knowledge_receipt_action(
    db,
    *,
    article_id: int,
    company_id: int,
    employee_id: int,
    action_type: str,
    article_version: str | None,
):
    db.add(
        KnowledgeArticleReceiptLog(
            article_id=article_id,
            company_id=company_id,
            employee_id=employee_id,
            action_type=action_type,
            article_version=article_version,
        )
    )
