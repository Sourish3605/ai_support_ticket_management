import json
import re
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None
from rest_framework import generics, permissions, status, views
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import (
    Category,
    SubCategory,
    Priority,
    SLARule,
    Department,
    Team,
    SeverityRule,
    Product,
    KnowledgeArticle,
)
from .serializers import (
    CategorySerializer,
    SubCategorySerializer,
    PrioritySerializer,
    SLARuleSerializer,
    DepartmentSerializer,
    TeamSerializer,
    SeverityRuleSerializer,
    ProductSerializer,
    KnowledgeArticleSerializer,
)


def extract_and_structure_pdf(full_text, filename):
    """
    Extracts structured fields (Title, Category, SubCategory, Tags, Content, Steps)
    from PDF text using smart regex/heuristics matched against database Master Data.
    """
    categories = list(Category.objects.values_list("name", flat=True))
    subcategories = list(SubCategory.objects.values_list("name", flat=True))
    base_name = filename.rsplit(".", 1)[0] if "." in filename else filename
    clean_name_title = re.sub(r"[_\-]+", " ", base_name).strip().title()

    lines = [line.strip() for line in full_text.split("\n") if line.strip()]
    first_heading = lines[0] if lines else ""
    if first_heading and len(first_heading) <= 100 and not first_heading.lower().startswith(("page ", "http", "www", "copyright")):
        derived_title = first_heading
    else:
        derived_title = clean_name_title or "Uploaded Knowledge Base Document"

    matched_category = categories[0] if categories else "General"
    text_lower = full_text.lower()
    for cat in categories:
        if cat.lower() in text_lower or cat.lower() in filename.lower():
            matched_category = cat
            break

    matched_sub = ""
    for sub in subcategories:
        if sub.lower() in text_lower:
            matched_sub = sub
            break

    # Extract keywords
    word_tokens = re.findall(r"\b[a-zA-Z]{3,15}\b", f"{derived_title} {matched_category} {matched_sub}")
    unique_tags = []
    for w in word_tokens:
        wl = w.lower()
        if wl not in ["the", "and", "for", "with", "this", "that", "from", "user", "guide"] and wl not in unique_tags:
            unique_tags.append(wl)
    tags_str = ", ".join(unique_tags[:6])

    step_lines = [l for l in lines if re.match(r"^(?:\d+[\.\)]|[\-\*•])\s+", l)]
    if not step_lines and lines:
        step_lines = lines[:10]

    return {
        "title": derived_title,
        "category": matched_category,
        "sub_category": matched_sub,
        "tags": tags_str,
        "content": full_text[:8000],
        "steps": step_lines[:15],
    }


class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.prefetch_related("sub_categories").all().order_by("id")
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class SubCategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = SubCategorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = SubCategory.objects.select_related("category").all().order_by("id")
        category_id = self.request.query_params.get("category") or self.request.query_params.get("category_id")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset


class SubCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SubCategory.objects.all()
    serializer_class = SubCategorySerializer
    permission_classes = [permissions.AllowAny]


class PriorityListCreateView(generics.ListCreateAPIView):
    queryset = Priority.objects.all().order_by("level", "id")
    serializer_class = PrioritySerializer
    permission_classes = [permissions.AllowAny]


class PriorityDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Priority.objects.all()
    serializer_class = PrioritySerializer
    permission_classes = [permissions.AllowAny]


class KnowledgeArticleListCreateView(generics.ListCreateAPIView):
    serializer_class = KnowledgeArticleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = KnowledgeArticle.objects.all().order_by("-id")
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        if category:
            queryset = queryset.filter(category__iexact=category)
        if search:
            queryset = queryset.filter(
                title__icontains=search
            ) | queryset.filter(
                content__icontains=search
            ) | queryset.filter(
                tags__icontains=search
            )
        return queryset


class KnowledgeArticleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = KnowledgeArticle.objects.all()
    serializer_class = KnowledgeArticleSerializer
    permission_classes = [permissions.AllowAny]


class KnowledgeArticleUploadPDFView(views.APIView):
    """
    Upload and parse PDF document for the Support Knowledge Base.
    Extracts text from PDF, structures fields using AI/Heuristic, and returns structured
    payload (or automatically creates the KnowledgeArticle if auto_save=true).
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get("file") or request.FILES.get("pdf")
        if not file_obj:
            return Response(
                {"error": "No PDF file provided. Please attach a .pdf document."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not file_obj.name.lower().endswith(".pdf"):
            return Response(
                {"error": "Unsupported file type. Only PDF (.pdf) files are supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reader = PdfReader(file_obj)
            total_pages = len(reader.pages)
            if total_pages == 0:
                return Response(
                    {"error": "The uploaded PDF document has no pages."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            pages_text = []
            for page in reader.pages:
                txt = page.extract_text()
                if txt and txt.strip():
                    pages_text.append(txt.strip())

            full_text = "\n\n".join(pages_text).strip()
            if not full_text:
                return Response(
                    {"error": "No readable text could be extracted from this PDF. It may contain scanned images only."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            structured = extract_and_structure_pdf(full_text, file_obj.name)
            structured["source"] = f"PDF: {file_obj.name}"
            structured["page_count"] = total_pages
            structured["file_name"] = file_obj.name

            auto_save = request.data.get("auto_save") in [True, "true", "True", 1, "1"]
            if auto_save:
                steps_val = structured.get("steps", [])
                if isinstance(steps_val, list):
                    steps_json = json.dumps(steps_val)
                else:
                    steps_json = str(steps_val)

                article = KnowledgeArticle.objects.create(
                    title=structured.get("title", file_obj.name),
                    category=structured.get("category", "General"),
                    sub_category=structured.get("sub_category", ""),
                    tags=structured.get("tags", ""),
                    content=structured.get("content", full_text),
                    steps=steps_json,
                    source=structured.get("source", f"PDF: {file_obj.name}"),
                    is_active=True,
                )
                serializer = KnowledgeArticleSerializer(article)
                return Response(
                    {
                        "message": f"Successfully parsed and created knowledge article '{article.title}' from PDF.",
                        "article": serializer.data,
                        "is_created": True,
                    },
                    status=status.HTTP_201_CREATED,
                )

            return Response(
                {
                    "message": f"Successfully extracted content from '{file_obj.name}' ({total_pages} pages).",
                    "data": structured,
                    "is_created": False,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"error": f"Failed to parse PDF document: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SLARuleListView(generics.ListAPIView):
    queryset = SLARule.objects.select_related("priority").all()
    serializer_class = SLARuleSerializer
    permission_classes = [permissions.AllowAny]


class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.AllowAny]


class TeamListView(generics.ListAPIView):
    queryset = Team.objects.select_related("department").all()
    serializer_class = TeamSerializer
    permission_classes = [permissions.AllowAny]


class SeverityRuleListView(generics.ListAPIView):
    queryset = SeverityRule.objects.all()
    serializer_class = SeverityRuleSerializer
    permission_classes = [permissions.AllowAny]


class ProductListView(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
