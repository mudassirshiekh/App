import type {ValueOf} from 'react-native-gesture-handler/lib/typescript/typeUtils';
import type {ReportActionListItemType, ReportListItemType, TransactionListItemType} from '@components/SelectionList/types';
import type CONST from '@src/CONST';
import type {SearchDataTypes, SearchReport} from '@src/types/onyx/SearchResults';

/** Model of the selected transaction */
type SelectedTransactionInfo = {
    /** Whether the transaction is selected */
    isSelected: boolean;

    /** If the transaction can be deleted */
    canDelete: boolean;

    /** If the transaction can be put on hold */
    canHold: boolean;

    /** If the transaction can be removed from hold */
    canUnhold: boolean;

    /** The action that can be performed for the transaction */
    action: string;
};

/** Model of selected results */
type SelectedTransactions = Record<string, SelectedTransactionInfo>;

/** Model of payment data used by Search bulk actions */
type PaymentData = {
    reportID: string;
    amount: number;
    paymentType: ValueOf<typeof CONST.IOU.PAYMENT_TYPE>;
};

type SortOrder = ValueOf<typeof CONST.SEARCH.SORT_ORDER>;
type SearchColumnType = ValueOf<typeof CONST.SEARCH.TABLE_COLUMNS>;
type ExpenseSearchStatus = ValueOf<typeof CONST.SEARCH.STATUS.EXPENSE>;
type InvoiceSearchStatus = ValueOf<typeof CONST.SEARCH.STATUS.INVOICE>;
type TripSearchStatus = ValueOf<typeof CONST.SEARCH.STATUS.TRIP>;
type ChatSearchStatus = ValueOf<typeof CONST.SEARCH.STATUS.CHAT>;
type SearchStatus = ExpenseSearchStatus | InvoiceSearchStatus | TripSearchStatus | ChatSearchStatus;

type SearchContext = {
    currentSearchHash: number;
    selectedTransactions: SelectedTransactions;
    selectedReports: Array<SearchReport['reportID']>;
    setCurrentSearchHash: (hash: number) => void;
    setSelectedTransactions: (selectedTransactions: SelectedTransactions, data: TransactionListItemType[] | ReportListItemType[] | ReportActionListItemType[]) => void;
    clearSelectedTransactions: (hash?: number) => void;
    shouldShowStatusBarLoading: boolean;
    setShouldShowStatusBarLoading: (shouldShow: boolean) => void;
    setLastSearchType: (type: string | undefined) => void;
    lastSearchType: string | undefined;
};

type ASTNode = {
    operator: ValueOf<typeof CONST.SEARCH.SYNTAX_OPERATORS>;
    left: ValueOf<typeof CONST.SEARCH.SYNTAX_FILTER_KEYS> | ASTNode;
    right: string | ASTNode | string[];
};

type QueryFilter = {
    operator: ValueOf<typeof CONST.SEARCH.SYNTAX_OPERATORS>;
    value: string | number;
};

type AdvancedFiltersKeys = ValueOf<typeof CONST.SEARCH.SYNTAX_FILTER_KEYS>;

type QueryFilters = Array<{
    key: AdvancedFiltersKeys;
    filters: QueryFilter[];
}>;

type SearchQueryString = string;

type SearchQueryAST = {
    type: SearchDataTypes;
    status: SearchStatus;
    sortBy: SearchColumnType;
    sortOrder: SortOrder;
    filters: ASTNode;
    policyID?: string;
};

type SearchQueryJSON = {
    inputQuery: SearchQueryString;
    hash: number;
    /** Hash used for putting queries in recent searches list. It ignores sortOrder and sortBy, because we want to treat queries differing only in sort params as the same query */
    recentSearchHash: number;
    flatFilters: QueryFilters;
} & SearchQueryAST;

type AutocompleteRange = {
    key: ValueOf<typeof CONST.SEARCH.SYNTAX_FILTER_KEYS & typeof CONST.SEARCH.SYNTAX_ROOT_KEYS>;
    length: number;
    start: number;
    value: string;
};

type SearchAutocompleteResult = {
    autocomplete: AutocompleteRange | null;
    ranges: AutocompleteRange[];
};

export type {
    SelectedTransactionInfo,
    SelectedTransactions,
    SearchColumnType,
    SearchStatus,
    SearchQueryAST,
    SearchQueryJSON,
    SearchQueryString,
    SortOrder,
    SearchContext,
    ASTNode,
    QueryFilter,
    QueryFilters,
    AdvancedFiltersKeys,
    ExpenseSearchStatus,
    InvoiceSearchStatus,
    TripSearchStatus,
    ChatSearchStatus,
    SearchAutocompleteResult,
    AutocompleteRange,
    PaymentData,
};
