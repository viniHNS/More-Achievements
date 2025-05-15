import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import { ILogger } from "@spt/models/spt/utils/ILogger"; 
import { IAchievement } from "@spt/models/eft/common/tables/IAchievement"; 
import fs from "fs";
import path from "node:path";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";

class Mod implements IPostDBLoadMod
{
    private logger: ILogger;
    private tables: IDatabaseTables;
    private static readonly debug: boolean = true;

    public postDBLoad(container: DependencyContainer): void
    {
        this.logger = container.resolve<ILogger>("WinstonLogger");
        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        this.tables = databaseServer.getTables(); 
        

        if (Mod.debug)
        {
            this.logger.logWithColor("MoreAchievements: Carregando arquivos de conquistas customizadas...", LogTextColor.GREEN);
        }

        this.importAchievementData();
        this.loadAchievementLocales();
        // this.loadImages(); // O carregamento de imagens pode ser adicionado depois, se necessário
    }

    private importAchievementData(): void
    {
        const dataPath = path.join(__dirname, "..", "db", "data");
        if (!fs.existsSync(dataPath))
        {
            if (Mod.debug)
            {
                this.logger.warning(`MoreAchievements: Diretório de dados não encontrado: ${dataPath}`);
            }
            return;
        }

        const files = fs.readdirSync(dataPath);
        
        const jsonFiles = files
            .filter(file => path.extname(file).toLowerCase() === ".json");

        const achievementTable = this.tables.templates.achievements;

        for (const file of jsonFiles)
        {   
            const filePath = path.join(dataPath, file);
            try
            {
                const data = this.loadAchievementFile(filePath);
                for (const achievement of data)
                {
                    achievementTable.push(achievement);
                }
                if (Mod.debug)
                {
                    this.logger.logWithColor(`MoreAchievements: Carregadas ${data.length} conquistas de ${file}`, LogTextColor.GREEN);
                }
            }
            catch (error)
            {
                this.logger.error(`MoreAchievements: Erro ao carregar o arquivo de conquista ${file}: ${error.message}`);
            }
        }    
    }

    private loadAchievementFile(filePath: string): IAchievement[] 
    {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const jsonData = JSON.parse(fileContent) as IAchievement[];
        return jsonData;
    }

    private loadAchievementLocales(): void
    {
        const localesPath = path.join(__dirname, "..", "db", "locales");
        if (!fs.existsSync(localesPath))
        {
            if (Mod.debug)
            {
                this.logger.warning(`MoreAchievements: Diretório de localidades não encontrado: ${localesPath}`);
            }
            return;
        }

        const langDirs = fs.readdirSync(localesPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const lang of langDirs)
        {
            const langDirPath = path.join(localesPath, lang);
            const localeFiles = fs.readdirSync(langDirPath)
                .filter(file => path.extname(file).toLowerCase() === ".json");

            for (const file of localeFiles)
            {
                const filePath = path.join(langDirPath, file);
                try
                {
                    const localeData = this.loadStringDictionary(filePath);
                    this.importLocaleData(lang, localeData);
                    if (Mod.debug)
                    {
                        this.logger.logWithColor(`MoreAchievements: Carregadas localizações de ${file} para o idioma ${lang}`, LogTextColor.GREEN);
                    }
                }
                catch (error)
                {
                    this.logger.error(`MoreAchievements: Erro ao carregar arquivo de localização ${file} para ${lang}: ${error.message}`);
                }
            }
        }
    }

    private importLocaleData(lang: string, localeData: Record<string, string>): void
    {
        if (!this.tables.locales.global[lang])
        {
            if (Mod.debug)
            {
                this.logger.warning(`MoreAchievements: Idioma ${lang} não encontrado nas tabelas de localização globais. Criando entrada.`);
            }
            this.tables.locales.global[lang] = {};
        }

        for (const entryKey in localeData)
        {
            this.tables.locales.global[lang][entryKey] = localeData[entryKey];
        }
    }

    private loadStringDictionary(filePath: string): Record<string, string> 
    {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const jsonData = JSON.parse(fileContent) as Record<string, string>;
        return jsonData;
    }

    // Você pode adicionar o método loadImages aqui no futuro, adaptando-o do CustomAchievementLoader
    // Lembre-se que ele pode exigir a interface IPreSptLoadMod e a resolução do ImageRouter.
    /*
    private loadImages(): void
    {
        // Adapte a lógica de CustomAchievementLoader/src/mod.ts:loadImages
        // Substitua this.InstanceManager.imageRouter por uma instância de ImageRouter obtida via container
        // Exemplo: const imageRouter = container.resolve<ImageRouter>("ImageRouter"); (em preSptLoad ou postDBLoad)
        // E certifique-se que os caminhos para as imagens estão corretos para a estrutura do seu mod.
        const imagesPath = path.join(__dirname, "..", "db", "images");
        if (!fs.existsSync(imagesPath))
        {
            this.logger.warning(`MoreAchievements: Diretório de imagens não encontrado: ${imagesPath}`);
            return;
        }

        // const imageRouter = container.resolve<ImageRouter>("ImageRouter"); // Precisaria ser acessível aqui
        // ... resto da lógica
    }
    */
}

export const mod = new Mod();