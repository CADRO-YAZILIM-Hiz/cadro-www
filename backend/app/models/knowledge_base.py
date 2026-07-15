from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class KnowledgeArticle(Base):
    __tablename__ = "knowledge_articles"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    target_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    target_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    article_type = Column(String(50), nullable=False, default="ARTICLE")  # ARTICLE, POLICY
    version = Column(String(20), nullable=False, default="1.0")
    status = Column(String(50), nullable=False, default="PUBLISHED")  # DRAFT, PUBLISHED, ARCHIVED
    require_ack = Column(Boolean, nullable=False, default=False)

    target_scope = Column(String(50), nullable=False, default="ALL")  # ALL, ROLE, DEPARTMENT, EMPLOYEE
    target_role = Column(String(50), nullable=True)

    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company")
    creator = relationship("Employee", foreign_keys=[created_by])
    updater = relationship("Employee", foreign_keys=[updated_by])
    target_employee = relationship("Employee", foreign_keys=[target_employee_id])
    target_department = relationship("Department")
    receipts = relationship(
        "KnowledgeArticleReceipt",
        back_populates="article",
        cascade="all, delete-orphan",
    )
    versions = relationship(
        "KnowledgeArticleVersion",
        back_populates="article",
        cascade="all, delete-orphan",
    )
    receipt_logs = relationship(
        "KnowledgeArticleReceiptLog",
        back_populates="article",
        cascade="all, delete-orphan",
    )


class KnowledgeArticleReceipt(Base):
    __tablename__ = "knowledge_article_receipts"
    __table_args__ = (
        UniqueConstraint("article_id", "employee_id", name="uq_knowledge_article_employee"),
    )

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("knowledge_articles.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)

    first_read_at = Column(DateTime, nullable=True)
    last_read_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_version = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    article = relationship("KnowledgeArticle", back_populates="receipts")
    employee = relationship("Employee")


class KnowledgeArticleVersion(Base):
    __tablename__ = "knowledge_article_versions"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("knowledge_articles.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    actor_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)

    snapshot_type = Column(String(30), nullable=False, default="UPDATED")
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    article_type = Column(String(50), nullable=False, default="ARTICLE")
    version = Column(String(20), nullable=False, default="1.0")
    status = Column(String(50), nullable=False, default="PUBLISHED")
    require_ack = Column(Boolean, nullable=False, default=False)
    target_scope = Column(String(50), nullable=False, default="ALL")
    target_role = Column(String(50), nullable=True)
    target_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    target_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    article = relationship("KnowledgeArticle", back_populates="versions")
    actor = relationship("Employee", foreign_keys=[actor_employee_id])


class KnowledgeArticleReceiptLog(Base):
    __tablename__ = "knowledge_article_receipt_logs"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("knowledge_articles.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    action_type = Column(String(20), nullable=False, default="READ")
    article_version = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    article = relationship("KnowledgeArticle", back_populates="receipt_logs")
    employee = relationship("Employee", foreign_keys=[employee_id])
